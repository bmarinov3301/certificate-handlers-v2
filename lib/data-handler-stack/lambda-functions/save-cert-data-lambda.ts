import {
  Handler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import {
	S3Client,
	PutObjectCommand
} from '@aws-sdk/client-s3';
import {
	DynamoDBClient,
	PutItemCommand
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { env } from 'process';
import {
	isEventValid,
	parseFormData,
	buildResponseHeaders,
	buildDynamoDocument
} from './function-utils';
import { UploadedImage } from '../types';

const s3Client = new S3Client();
const dynamoClient = new DynamoDBClient();
const imageBucketName = env.imageBuckerName ?? '';
const certDataTableName = env.certDataTableName ?? '';

export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Received event with body: ${JSON.stringify(event.body)}`);

		const eventValid = isEventValid(event.headers);
		if (!eventValid) {
			console.log(`Event not valid! Event headers - ${JSON.stringify(event.headers)}`);
	
			return {
				statusCode: 400,
				body: `Something went wrong`
			}
		}

		// Parse event form data
		const { image, fields, certId } = await parseFormData(event);
		console.log('Parsed form data image', JSON.stringify(image));
		console.log('Parsed form data fields', JSON.stringify(fields));
		console.log('Parsed form data cert ID', JSON.stringify(certId));

		// Save form data image to S3 bucket
		await uploadImageToS3(certId, image);

		// Save form data and S3 image link to DynamoDB
		await saveItemToDynamo(fields, certId);

		return {
      statusCode: 200,
      body: JSON.stringify({
				message: 'Success!'
			}),
			headers: buildResponseHeaders()
    };
	}
	catch (error: any) {
		console.error('Error processing upload:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
				error: JSON.stringify(error)
			}),
			headers: buildResponseHeaders()
    };
	}
}

const uploadImageToS3 = async (certId: string, image: UploadedImage) => {
	const s3Command = new PutObjectCommand({
		Bucket: imageBucketName,
		Key: `${certId}.png`,
		Body: image.content,
		ContentType: image.contentType
	});

	console.log(`Uploading image ${s3Command.input?.Key} to ${s3Command.input?.Bucket}...`);
	await s3Client.send(s3Command);
}

const saveItemToDynamo = async (fields: { [key: string]: string }, certId: string) => {
	const document = buildDynamoDocument(fields, certId, imageBucketName);
	const item = marshall(document);
	const dynamoCommand = new PutItemCommand({
		TableName: certDataTableName,
		Item: item
	});

	console.log(`Storing item with ID ${document.id} in DynamoDB table ${certDataTableName}...`);
	await dynamoClient.send(dynamoCommand);
}
