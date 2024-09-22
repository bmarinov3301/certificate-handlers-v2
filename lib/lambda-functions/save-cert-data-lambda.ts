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
import dynamoUtil from './utils/dynamo-util';
import { certificatesPage } from '../constants';

const imageBucketName = env.imageBuckerName ?? '';
const certDataTableName = env.certDataTableName ?? '';
const pdfTemplate = env.pdfTemplateFile ?? '';

export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Received event with body: ${JSON.stringify(event.body)}`);

		const eventValid = functionUtils.isEventValid(event);
		if (!eventValid) {
			console.log(`Event not valid! Event headers - ${JSON.stringify(event.headers)}`);
			return {
				statusCode: 400,
				body: `Something went wrong`
			}
		}

		// Parse event form data
		const { image, fields, certId } = await functionUtils.parseFormData(event);

		console.log('Parsed form data image', JSON.stringify(image));
		console.log('Parsed form data fields', JSON.stringify(fields));
		console.log('Parsed form data cert ID', JSON.stringify(certId));

		// Save form data image to S3 bucket
		await s3Utils.uploadObject(imageBucketName, `images/${certId}.png`, image.content, image.contentType);

		// Save form data and S3 image link to DynamoDB
		await saveItemToDynamo(fields, certId);

		// Retrieve PDF template
		const response = await s3Utils.getObject(imageBucketName, `template/${pdfTemplate}`);
		const modifiedPDF = await pdfUtils.fillInPdfFormData(response.Body as NodeJS.ReadableStream, certId, fields, image);
		// await s3Utils.uploadObject(imageBucketName, `certificates/${certId}.pdf`, modifiedPDF, 'application/pdf');

		return {
      statusCode: 200,
      body: JSON.stringify({
				certificatePage: `${certificatesPage}?certId=${certId}`,
				pdfData: modifiedPDF.toString('base64')
			}),
			headers: functionUtils.buildResponseHeaders()
    };
	}
	catch (error: any) {
		console.error('Error processing upload:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
				error: JSON.stringify(error)
			}),
			headers: functionUtils.buildResponseHeaders()
    };
	}
}

const saveItemToDynamo = async (fields: { [key: string]: string }, certId: string): Promise<void> => {
	const document = functionUtils.buildDynamoDocument(fields, certId, imageBucketName);
	const item = marshall(document);

	await dynamoUtil.uploadItem(certDataTableName, item);
}
