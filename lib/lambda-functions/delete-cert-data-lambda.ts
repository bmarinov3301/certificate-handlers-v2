import {
	Handler,
	APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import functionUtils from './utils/function-utils';
import dynamoUtils from './utils/dynamo-utils';
import { env } from 'process';
import s3Utils from './utils/s3-utils';

const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const certDataTableName = env.certDataTableName ?? '';
const imagesBucket = env.imagesBucket ?? '';

export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Received event with path params: ${JSON.stringify(event.pathParameters)}`);
		const certId = event.pathParameters?.certId ?? '';

		console.log('Util result - ', !functionUtils.isEventValid(event));
		console.log('CertId result - ', !certId);
		console.log('Regex result - ', !guidRegex.test(certId));
		if(!functionUtils.isEventValid(event) || !certId || !guidRegex.test(certId)) {
			console.log(`Event not valid! Event data - ${JSON.stringify({
				certId,
				headers: event.headers
			})}`);
			return functionUtils.buildResponse({ error: 'Event not valid' }, 400);
		}

		await dynamoUtils.deleteItem(certDataTableName, certId);
		await s3Utils.deleteObject(imagesBucket, `${certId}.png`);
		await s3Utils.deleteObject(imagesBucket, `${certId}-qr-code.png`);

		return functionUtils.buildResponse({ message: 'Success' }, 200);
	}
	catch (error: any) {
		console.log('Error while deleting data', error);
		return functionUtils.buildResponse({ error: JSON.stringify(error) }, 500);
	}
}
