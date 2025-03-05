import { Handler } from 'aws-lambda';
import dynamoUtils from './utils/dynamo-utils';

const certificatesTableName = process.env.certDataTableName ?? '';

export const handler: Handler = async (event: any) => {
    try {
        // Create backup with timestamp
        const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
        const backupName = `${certificatesTableName}-backup-${timestamp}`;
        
        await dynamoUtils.createBackup(certificatesTableName, backupName);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Backup created successfully',
                backupName: backupName
            })
        };
    } catch (error) {
        console.error('Error creating backup:', error);
        throw error;
    }
};
