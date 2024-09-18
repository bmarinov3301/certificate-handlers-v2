import { Construct } from 'constructs';
import {
	resourcePrefix,
	lambdaCustomHeaderName,
	lambdaCustomHeaderValue,
	restApiAllowedOrigins,
	pdfTemplateFile,
	pdfDataEndpoint,
	userTimeZone
} from '../constants';
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
import stackUtils from '../stack-utils';
import path = require('path');
// todo: Change this to image saving stack. Change Lambda to be image saving lambda and use Step Functions for WorkFlow
export class DataHandlerStack extends Stack {
	public readonly lambda: NodejsFunction;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// S3
		const filesBucket = new s3.Bucket(this, 'FilesBucket', {
			bucketName: `${resourcePrefix}-certificate-files`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
		});

		// DynamoDB
		var certificateDataTable = new dynamoDB.Table(this, 'CertificatesDataTable', {
			tableName: `${resourcePrefix}-certificates-data`,
			partitionKey: { name: 'id', type: dynamoDB.AttributeType.STRING },
			removalPolicy: RemovalPolicy.DESTROY
		});

		// IAM
		const dataHandlerLambdaRole = new iam.Role(this, 'DataHandlerLambdaRole', {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `${resourcePrefix}-data-handler-lambda-role`
		});
		stackUtils.iam.addCloudWatchPermissions(dataHandlerLambdaRole);
		stackUtils.iam.addS3Permissions(dataHandlerLambdaRole, filesBucket.bucketArn, ['s3:GetObject', 's3:PutObject']);
		stackUtils.iam.addDynamoPermissions(dataHandlerLambdaRole, [certificateDataTable.tableArn], ['dynamodb:GetItem', 'dynamodb:PutItem']);

		// Lambda
		const saveDataLambda = new NodejsFunction(this, 'SaveCertDataLambda', {
			functionName: `${resourcePrefix}-save-cert-data-lambda`,
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: 'handler',
			entry: path.join(__dirname, 'lambda-functions/save-cert-data-lambda.ts'),
			memorySize: 256,
			timeout: Duration.seconds(15),
			role: dataHandlerLambdaRole,
			environment: {
				imageBuckerName: filesBucket.bucketName,
				certDataTableName: certificateDataTable.tableName,
				lambdaCustomHeaderName,
				lambdaCustomHeaderValue,
				allowedOrigin: restApiAllowedOrigins[0],
				pdfTemplateFile: pdfTemplateFile,
				pdfDataEndpoint: pdfDataEndpoint,
				userTimeZone: userTimeZone
			}
		});
		this.lambda = saveDataLambda;
	}
}
