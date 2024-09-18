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

const s3Client = new S3Client();
const dynamoClient = new DynamoDBClient();

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
		const contentType = event.headers['Content-Type'] || event.headers['content-type'];
		const formData = await parseFormData(event, contentType ?? '');
		console.log('Parsed form data', JSON.stringify(formData));

		// Save image from form data to S3 bucket
		const certId = crypto.randomUUID();
		const imageBucketName = env.imageBuckerName ?? '';
		const s3Command = new PutObjectCommand({
			Bucket: imageBucketName,
			Key: `${certId}.png`,
			Body: formData.files[0].content,
			ContentType: formData.files[0].contentType
		});

		console.log(`Uploading image ${s3Command.input?.Key} to ${s3Command.input?.Bucket}...`);
		await s3Client.send(s3Command);

		// Save form data and S3 image link to DynamoDB
		const certDataTableName = env.certDataTableName ?? '';
		const document = buildDynamoDocument(formData, certId, imageBucketName);
		const item = marshall(document);
		const dynamoCommand = new PutItemCommand({
			TableName: certDataTableName,
			Item: item
		});

		console.log(`Storing item with ID ${document.id} in DynamoDB table ${certDataTableName}...`);
		await dynamoClient.send(dynamoCommand);

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


