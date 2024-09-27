import {
	Handler,
	APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import functionUtils from './utils/function-utils';
import dynamoUtils from './utils/dynamo-utils';
import { env } from 'process';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const certDataTableName = env.certDataTableName ?? '';

export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Received event with query: ${JSON.stringify(event.queryStringParameters)}`);

		const params = event.queryStringParameters;

		if (!functionUtils.isEventValid(event) || !params || !params['certId']) {
			console.log(`Event not valid! Event data - ${JSON.stringify({
				params,
				headers: event.headers
			})}`);
			return functionUtils.buildResponse({ error: 'Event not valid' }, 400);
		}

		const certId = params['certId'];

		const response = await dynamoUtils.getItem(certDataTableName, certId);
		if (!response.Item) {
			console.log(`Item with key ${certId} not found`);
			return functionUtils.buildResponse({ error: 'Not found' }, 404);
		}
		const item = unmarshall(response.Item);
		console.log('Item - ', item);
		return functionUtils.buildResponse({ data: item }, 200);
	}
	catch (error: any) {
		console.log('Error while getting data', error);
		return functionUtils.buildResponse({ error: JSON.stringify(error) }, 500);
	}
}
