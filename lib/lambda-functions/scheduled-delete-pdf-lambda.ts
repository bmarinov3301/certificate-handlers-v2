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

	console.log('Current time - ', moment().format());

	listResult.Contents.map(item => {
		console.log(item.LastModified);
	});
}