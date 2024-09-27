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
		const templatesBucket = new s3.Bucket(this, 'TemplatesBucket', {
			bucketName: `${resourcePrefix}-pdf-templates`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
		});

		const staticFilesBucket = new s3.Bucket(this, 'ImagesBucket', {
			bucketName: `${resourcePrefix}-static-images`,
			publicReadAccess: true,
			blockPublicAccess: {
				blockPublicAcls: false,
				blockPublicPolicy: false,
				ignorePublicAcls: false,
				restrictPublicBuckets: false
			},
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
		stackUtils.iam.addS3Permissions(dataHandlerLambdaRole, staticFilesBucket.bucketArn, ['s3:PutObject', 's3:DeleteObject']);
		stackUtils.iam.addS3Permissions(dataHandlerLambdaRole, templatesBucket.bucketArn, ['s3:GetObject']);
		stackUtils.iam.addDynamoPermissions(dataHandlerLambdaRole, [certificateDataTable.tableArn], ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem']);

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
				templatesBucket: templatesBucket.bucketName,
				imagesBucket: staticFilesBucket.bucketName,
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
				lambdaCustomHeaderValue,
				allowedOrigin: restApiAllowedOrigins[0],
			}
		});

		const deleteDataLambda = new NodejsFunction(this, 'DeleteCertDataLambda', {
			functionName: `${resourcePrefix}-delete-cert-data-lambda`,
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: 'handler',
			entry: path.join(__dirname, 'lambda-functions/delete-cert-data-lambda.ts'),
			memorySize: 128,
			timeout: Duration.seconds(10),
			role: dataHandlerLambdaRole,
			environment: {
				imagesBucket: staticFilesBucket.bucketName,
				certDataTableName: certificateDataTable.tableName,
				lambdaCustomHeaderName,
				lambdaCustomHeaderValue,
				allowedOrigin: restApiAllowedOrigins[0]
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

		const deleteDataResource = apiGateway.root.addResource('delete-data');
		const deleteCertResource = deleteDataResource.addResource('{certId}');
		deleteCertResource.addMethod('DELETE', new LambdaIntegration(deleteDataLambda), {
			requestParameters: {
        'method.request.path.certId': true
      }
		});
	}
}
