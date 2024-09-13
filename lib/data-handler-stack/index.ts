import { Construct } from 'constructs';
import { resourcePrefix } from '../constants';
import {
	Stack,
	StackProps,
	RemovalPolicy,
	Duration,
	aws_dynamodb as dynamoDB,
	aws_s3 as s3,
	aws_iam as iam,
	aws_lambda as lambda
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
	addCloudWatchPermissions,
	addS3Permissions,
	addDynamoPermissions
} from '../common/iam-helper';
import path = require('path');

export class DataHandlerStack extends Stack {
	public readonly imagesBucketName: string;
	public readonly certificateDataTableName: string;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// S3
		const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
			bucketName: `${resourcePrefix}-certificate-images`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
		});
		this.imagesBucketName = imagesBucket.bucketName;

		// DynamoDB
		var certificateDataTable = new dynamoDB.Table(this, 'CertificatesDataTable', {
			tableName: `${resourcePrefix}-certificates-data`,
			partitionKey: { name: 'id', type: dynamoDB.AttributeType.STRING },
			removalPolicy: RemovalPolicy.DESTROY
		});
		this.certificateDataTableName = certificateDataTable.tableName;

		// IAM
		const dataHandlerLambdaRole = new iam.Role(this, 'DataHandlerLambdaRole', {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `${resourcePrefix}-data-handler-lambda-role`
		});
		addCloudWatchPermissions(dataHandlerLambdaRole);
		addS3Permissions(dataHandlerLambdaRole, imagesBucket.bucketArn, ['s3:GetObject', 's3:PutObject']);
		addDynamoPermissions(dataHandlerLambdaRole, [certificateDataTable.tableArn], ['dynamodb:PutItem']);

		// Lambda
		const dataHandlerLambda = new NodejsFunction(this, 'DataHandlerLambda', {
			functionName: `${resourcePrefix}-data-handler-lambda`,
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: 'handler',
			entry: path.join(__dirname, 'lambda-functions/data-handler-lambda.ts'),
			memorySize: 128,
			timeout: Duration.seconds(10),
			role: dataHandlerLambdaRole
		});
	}
}

