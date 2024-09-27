import {
  Handler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import { env } from 'process';
import functionUtils from './utils/function-utils';
import s3Utils from './utils/s3-utils';
import pdfUtils from './utils/pdf-utils';
import dynamoUtil from './utils/dynamo-utils';

const templatesBucketName = env.templatesBucket ?? '';
const imagesBucketName = env.imagesBucket ?? '';
const certDataTableName = env.certDataTableName ?? '';
const pdfTemplate = env.pdfTemplateFile ?? '';
const certificatesPage = env.certificatesPage ?? '';

export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Received event with body: ${JSON.stringify(event.body)}`);
		const contentType = event.headers['Content-Type'] || event.headers['content-type'];

		if (!functionUtils.isEventValid(event) || !contentType?.startsWith('multipart/form-data')) {
			console.log(`Event not valid! Event data - ${JSON.stringify({
				body: event.body,
				headers: event.headers
			})}`);
			return functionUtils.buildResponse({ error: 'Event not valid' }, 400);
		}

		// Parse event form data
		const { image, fields, certId } = await functionUtils.parseFormData(event);

		console.log('Parsed form data image', JSON.stringify(image));
		console.log('Parsed form data fields', JSON.stringify(fields));
		console.log('Parsed form data cert ID', JSON.stringify(certId));
		if (!image || !fields['clientName'] || !fields['heading'] || !fields['details']) {
			return functionUtils.buildResponse({ error: 'Could not parse data' }, 400);
		}

		const qrCodeBuffer = await functionUtils.generateQRCode(`${certificatesPage}?certId=${certId}`);

		// Save form data image to S3 bucket
		await s3Utils.uploadObject(imagesBucketName, `${certId}.png`, image.content, image.contentType);
		// todo: can you extract object URL from response ?
		await s3Utils.uploadObject(imagesBucketName, `${certId}-qr-code.png`, qrCodeBuffer, 'image/png');

		// Save form data and S3 image link to DynamoDB
		await saveItemToDynamo(fields, certId);

		// Retrieve PDF template
		console.log(fields['outcome']);
		const templateSuffix = fields['outcome'] == 'true' ? 'authentic' : 'not-authentic';
		const response = await s3Utils.getObject(templatesBucketName, `${pdfTemplate}-${templateSuffix}.pdf`);
		const modifiedPDF = await pdfUtils.fillInPdfFormData(response.Body as NodeJS.ReadableStream, qrCodeBuffer, certId, fields, image);

		return functionUtils.buildResponse({
			certificatePage: `${certificatesPage}?certId=${certId}`,
			pdfData: modifiedPDF.toString('base64')
		}, 200);
	}
	catch (error: any) {
		console.error('Error processing upload:', error);
		return functionUtils.buildResponse({ error: JSON.stringify(error) }, 500);
	}
}

const saveItemToDynamo = async (fields: { [key: string]: string }, certId: string): Promise<void> => {
	const document = functionUtils.buildDynamoDocument(fields, certId, imagesBucketName);
	const item = marshall(document);

	await dynamoUtil.uploadItem(certDataTableName, item);
}
