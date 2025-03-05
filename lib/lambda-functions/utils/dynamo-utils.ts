import {
	AttributeValue,
	DeleteItemCommand,
	DynamoDBClient,
	GetItemCommand,
	GetItemCommandOutput,
	PutItemCommand,
	CreateBackupCommand,
	ListBackupsCommand,
	DeleteBackupCommand
} from '@aws-sdk/client-dynamodb';
import moment from 'moment';

const dynamoClient = new DynamoDBClient();

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

const uploadItem = async (tableName: string, item: Record<string, AttributeValue>): Promise<void> => {
	const command = new PutItemCommand({
		TableName: tableName,
		Item: item
	});

	console.log(`Storing item with ID ${JSON.stringify(item['id'])} in table ${tableName}...`);
	await dynamoClient.send(command);
}

const deleteItem = async (tableName: string, key: string): Promise<void> => {
	const command = new DeleteItemCommand({
		TableName: tableName,
		Key: {
			'id': {
				'S': key
			}
		}
	});

	console.log(`Deleting item with ID ${key} in table ${tableName}...`);
	await dynamoClient.send(command);
}

const createBackup = async (tableName: string, backupName: string): Promise<void> => {
	const listCommand = new ListBackupsCommand({
		TableName: tableName
	});
	const existingBackups = await dynamoClient.send(listCommand);
	console.log('Current backups:', existingBackups);

	const command = new CreateBackupCommand({
		TableName: tableName,
		BackupName: backupName
	});

	console.log(`Creating backup ${backupName} for table ${tableName}...`);
	const result = await dynamoClient.send(command);
	console.log('Successfully created backup:', result);

	if (existingBackups.BackupSummaries?.length) {
		console.log('Deleting old backups...');
		for (const backup of existingBackups.BackupSummaries) {
			if (backup.BackupName !== result.BackupDetails?.BackupName) {
				const deleteCommand = new DeleteBackupCommand({
					BackupArn: backup.BackupArn
				});
				await dynamoClient.send(deleteCommand);
				console.log(`Deleted backup ${backup.BackupName}...`);
			}
		}
	}
}

const dynamoUtils = {
	getItem,
	uploadItem,
	deleteItem,
	createBackup
}
export default dynamoUtils;
