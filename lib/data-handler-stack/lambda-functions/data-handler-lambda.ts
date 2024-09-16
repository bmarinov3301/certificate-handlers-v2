import {
  Handler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import {
	S3Client,
	PutObjectCommand
} from '@aws-sdk/client-s3';
import { env } from 'process';
import {
	isEventValid,
	parseFormData,
	buildResponseHeaders
} from './function-utils';

const s3Client = new S3Client();

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
	
		const certId = crypto.randomUUID();
		const imageBucketName = env.imageBuckerName ?? '';
	
		const contentType = event.headers['Content-Type'] || event.headers['content-type'];
		const formData = await parseFormData(event, contentType ?? '');
		console.log('Parsed form data', JSON.stringify(formData));

		const command = new PutObjectCommand({
			Bucket: imageBucketName,
			Key: `${certId}.png`,
			Body: formData.files[0].content,
			ContentType: formData.files[0].contentType
		});

		console.log(`Uploading image ${command.input?.Key} to ${command.input?.Bucket}...`);
		await s3Client.send(command);

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
