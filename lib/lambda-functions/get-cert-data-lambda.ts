import {
	Handler,
	APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import functionUtils from './utils/function-utils';
import dynamoUtil from './utils/dynamo-util';
import { env } from 'process';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const certDataTableName = env.certDataTableName ?? '';

export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Received event with query: ${JSON.stringify(event.queryStringParameters)}`);

		const params = event.queryStringParameters;

		if (!params || !params['certId']) {
			console.log(`Event not valid! Query params - ${JSON.stringify(params)}`);
			return functionUtils.buildResponse({ message: 'Event not valid' }, 400);
		}

		const certId = params['certId'];

		const response = await dynamoUtil.getItem(certDataTableName, certId);
		if (!response.Item) {
			console.log(`Item with key ${certId} not found`);
			return functionUtils.buildResponse({ message: 'Not found' }, 404);
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