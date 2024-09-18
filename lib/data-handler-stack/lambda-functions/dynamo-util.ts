import {
	AttributeValue,
	DynamoDBClient,
	PutItemCommand
} from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient();

const uploadItem = async (tableName: string, item: Record<string, AttributeValue>): Promise<void> => {
	const dynamoCommand = new PutItemCommand({
		TableName: tableName,
		Item: item
	});

	console.log(`Storing item with ID ${JSON.stringify(item['id'])} in table ${tableName}...`);
	await dynamoClient.send(dynamoCommand);
}

const dynamoUtil = {
	uploadItem
}
export default dynamoUtil;
