import {
	Handler
} from 'aws-lambda';
import { env } from 'process';
import s3Utils from './utils/s3-utils';
import moment from 'moment';

const certificatesBucketName = env.certificatesBucket ?? '';

export const handler: Handler = async (event: any): Promise<void> => {
	const listResult = await s3Utils.getAllObjects(certificatesBucketName);

	if (!listResult.Contents || listResult.Contents.length === 0) {
    console.log(`Bucket ${certificatesBucketName} is empty. Ending process...`);
    return;
  }

	const now = moment();

	const objectsToDelete = listResult.Contents
	.filter(object => {
		const itemModifiedAt = moment(object.LastModified);
		return moment(itemModifiedAt).isBefore(now.subtract(1, 'days'));
	}).map(item => ({ Key: item.Key! }));
	console.log('Keys to delete - ', JSON.stringify(objectsToDelete));

	if (objectsToDelete && objectsToDelete.length == 0) {
		console.log(`No keys to delete found in S3 bucket result list - `, JSON.stringify(listResult.Contents));
    return;
	}

	await s3Utils.deleteObjectList(certificatesBucketName, objectsToDelete);
	console.log('Successfully deleted object collection. Ending process...');
}