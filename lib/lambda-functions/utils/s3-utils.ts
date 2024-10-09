import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	GetObjectCommandOutput,
	ListObjectsV2Command,
	ListObjectsV2CommandOutput,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

const generatePresignedUrl = async (bucketName: string, key: string): Promise<string> => {
	const command = new GetObjectCommand({
		Bucket: bucketName,
		Key: key
	});

	console.log(`Generating presigned URL for object with key ${key} in bucket ${bucketName}`);
	return await getSignedUrl(s3Client, command, { expiresIn: 300 });
}

const getAllObjects = async(bucketName: string): Promise<ListObjectsV2CommandOutput> => {
	const command = new ListObjectsV2Command({
		Bucket: bucketName
	});

	console.log(`Getting all objects from bucket ${bucketName}`);
	return await s3Client.send(command);
}

const deleteObjectList = async (bucketName: string, objectsToDelete: { Key: string }[]) => {
	const command = new DeleteObjectsCommand({
		Bucket: bucketName,
		Delete: { Objects: objectsToDelete }
	});

	console.log(`Deleting objects from S3 bucket ${bucketName} - `, JSON.stringify(objectsToDelete));
	await s3Client.send(command);
}

const s3Utils = {
	getObject,
	uploadObject,
	deleteObject,
	generatePresignedUrl,
	getAllObjects,
	deleteObjectList
}
export default s3Utils;
