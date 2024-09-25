import {
	GetObjectCommand,
	GetObjectCommandOutput,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';

const s3Client = new S3Client();

const uploadObject = async (bucketName: string, key: string, buffer: Buffer | undefined, contentType: string): Promise<void> => {
	const s3Command = new PutObjectCommand({
		Bucket: bucketName,
		Key: key,
		Body: buffer,
		ContentType: contentType
	});

	console.log(`Uploading image ${s3Command.input?.Key} with content type ${contentType} to ${s3Command.input?.Bucket}...`);
	await s3Client.send(s3Command);
}

const getObject = async (bucket: string, key: string): Promise<GetObjectCommandOutput> => {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key
	});

	console.log(`Attempting to retrieve object key ${key} from bucket ${bucket}...`);
	return await s3Client.send(command);
}

const s3Utils = {
	getObject,
	uploadObject
}
export default s3Utils;
