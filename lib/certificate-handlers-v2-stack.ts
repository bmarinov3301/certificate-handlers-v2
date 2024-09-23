import { Construct } from 'constructs';
import {
	resourcePrefix,
	lambdaCustomHeaderName,
	lambdaCustomHeaderValue,
	restApiAllowedOrigins,
	pdfTemplateFile,
	certificatesPage,
	userTimeZone
} from './constants';
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
import {
  RestApi,
  LambdaIntegration,
  Cors
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import stackUtils from './stack-utils';
import path = require('path');

export class CertificateHandlersV2Stack extends Stack {
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
			timeout: Duration.seconds(30),
			role: dataHandlerLambdaRole,
			environment: {
				imageBuckerName: filesBucket.bucketName,
				certDataTableName: certificateDataTable.tableName,
				lambdaCustomHeaderName,
				lambdaCustomHeaderValue,
				allowedOrigin: restApiAllowedOrigins[0],
				pdfTemplateFile,
				certificatesPage,
				userTimeZone
			}
		});

		const getDataLambda = new NodejsFunction(this, 'GetCertDataLambda', {
			functionName: `${resourcePrefix}-get-cert-data-lambda`,
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: 'handler',
			entry: path.join(__dirname, 'lambda-functions/get-cert-data-lambda.ts'),
			memorySize: 128,
			timeout: Duration.seconds(10),
			role: dataHandlerLambdaRole,
			environment: {
				certDataTableName: certificateDataTable.tableName,
				lambdaCustomHeaderName,
				allowedOrigin: restApiAllowedOrigins[0],
			}
		});

		// API Gateway
		const apiGateway = new RestApi(this, 'APIGateway', {
      restApiName: `${resourcePrefix}-rest-api-gateway`,
			binaryMediaTypes: ['multipart/form-data'],
      defaultCorsPreflightOptions: {
        allowOrigins: restApiAllowedOrigins,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', lambdaCustomHeaderName],
    }
    });
    const uploadDataResource = apiGateway.root.addResource('upload-data');
    uploadDataResource.addMethod('POST', new LambdaIntegration(saveDataLambda));

		const getDataResource = apiGateway.root.addResource('get-data');
		getDataResource.addMethod('GET', new LambdaIntegration(getDataLambda));
	}
}
