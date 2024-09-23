import {
	AttributeValue,
	DynamoDBClient,
	GetItemCommand,
	GetItemCommandOutput,
	PutItemCommand
} from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient();

const uploadItem = async (tableName: string, item: Record<string, AttributeValue>): Promise<void> => {
	const command = new PutItemCommand({
		TableName: tableName,
		Item: item
	});

	console.log(`Storing item with ID ${JSON.stringify(item['id'])} in table ${tableName}...`);
	await dynamoClient.send(command);
}

const getItem = async (tableName: string, key: string): Promise<GetItemCommandOutput> => {
	const command = new GetItemCommand({
		TableName: tableName,
		Key: {
			'id': {
				'S': key
			}
		}
	});

	console.log(`Getting item with key ${key} from table ${tableName}...`);

	return await dynamoClient.send(command);
}

const dynamoUtil = {
	uploadItem,
	getItem
}
export default dynamoUtil;
