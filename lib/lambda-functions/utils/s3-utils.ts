import {
	DeleteObjectCommand,
	GetObjectCommand,
	GetObjectCommandOutput,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';

const s3Client = new S3Client();

const getObject = async (bucket: string, key: string): Promise<GetObjectCommandOutput> => {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key
	});

	console.log(`Attempting to retrieve object key ${key} from bucket ${bucket}...`);
	return await s3Client.send(command);
}

const uploadObject = async (bucketName: string, key: string, buffer: Buffer | undefined, contentType: string): Promise<void> => {
	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: key,
		Body: buffer,
		ContentType: contentType
	});

	console.log(`Uploading image ${command.input?.Key} with content type ${contentType} to ${command.input?.Bucket}...`);
	await s3Client.send(command);
}

const deleteObject = async (bucketName: string, key: string): Promise<void> => {
	const command = new DeleteObjectCommand({
		Bucket: bucketName,
		Key: key
	});

	console.log(`Deleting image with key ${key} from bucket ${bucketName}...`);
	await s3Client.send(command);
}

const s3Utils = {
	getObject,
	uploadObject,
	deleteObject
}
export default s3Utils;
