import { Construct } from 'constructs';
import {
	resourcePrefix,
	lambdaCustomHeaderName,
	restApiAllowedOrigins,
	pdfTemplateFile,
	certificatesPage,
	userTimeZone
} from './constants';
import {
	Stack,
	StackProps,
	Duration,
	RemovalPolicy,
	aws_dynamodb as dynamoDB,
	aws_s3 as s3,
	aws_iam as iam,
	aws_events as events,
	aws_events_targets as targets
} from 'aws-cdk-lib';
import {
  RestApi,
  LambdaIntegration,
  Cors
} from 'aws-cdk-lib/aws-apigateway';
import stackUtils from './stack-utils';
import path = require('path');

export class CertificateHandlersV2Stack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// S3
		const templatesBucket = new s3.Bucket(this, 'TemplatesBucket', {
			bucketName: `${resourcePrefix}-pdf-templates-bucket`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true
		});

		const staticFilesBucket = new s3.Bucket(this, 'ImagesBucket', {
			bucketName: `${resourcePrefix}-static-images-bucket`,
			publicReadAccess: true,
			blockPublicAccess: {
				blockPublicAcls: false,
				blockPublicPolicy: false,
				ignorePublicAcls: false,
				restrictPublicBuckets: false
			},
			encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true,
			lifecycleRules: [
				{
					transitions: [
						{
							storageClass: s3.StorageClass.INFREQUENT_ACCESS,
							transitionAfter: Duration.days(30)
						}
					]
				}
			]
		});

		const certificatesBucket = new s3.Bucket(this, 'CertificatesBucket', {
			bucketName: `${resourcePrefix}-pdf-certificates-bucket`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true
		});

		// DynamoDB
		var certificateDataTable = new dynamoDB.Table(this, 'CertificatesDataTable', {
			tableName: `${resourcePrefix}-certificates-data`,
			partitionKey: { name: 'id', type: dynamoDB.AttributeType.STRING },
			removalPolicy: RemovalPolicy.RETAIN,
			pointInTimeRecovery: true
		});

		// IAM
		const backupHandlerRole = new iam.Role(this, 'DynamoBackupHandlerRole', {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
			roleName: `${resourcePrefix}-dynamo-backup-handler-role`
		});
		stackUtils.iam.addDynamoPermissions(backupHandlerRole,
			[certificateDataTable.tableArn, `${certificateDataTable.tableArn}/backup/*`],
			['dynamodb:CreateBackup', 'dynamodb:DeleteBackup', 'dynamodb:ListBackups']);
		stackUtils.iam.addCloudWatchPermissions(backupHandlerRole);

		const dataHandlerLambdaRole = new iam.Role(this, 'DataHandlerLambdaRole', {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `${resourcePrefix}-data-handler-lambda-role`
		});
		stackUtils.iam.addCloudWatchPermissions(dataHandlerLambdaRole);
		stackUtils.iam.addS3Permissions(dataHandlerLambdaRole, staticFilesBucket.bucketArn, ['s3:PutObject', 's3:DeleteObject']);
		stackUtils.iam.addS3Permissions(dataHandlerLambdaRole, certificatesBucket.bucketArn, ['s3:PutObject', 's3:GetObject', 's3:DeleteObject']);
		stackUtils.iam.addS3Permissions(dataHandlerLambdaRole, templatesBucket.bucketArn, ['s3:GetObject']);
		stackUtils.iam.addDynamoPermissions(dataHandlerLambdaRole, [certificateDataTable.tableArn], ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem']);

		// Lambda
		const backupDynamoLambda = stackUtils.lambda.createLambda(
			this,
			'BackupDynamoLambda',
			'backup-dynamo-lambda',
			path.join(__dirname, 'lambda-functions/backup-dynamo-lambda.ts'),
			backupHandlerRole,
			{
				certDataTableName: certificateDataTable.tableName
			}
		)

		const saveDataLambda = stackUtils.lambda.createLambda(
			this,
			'SaveCertDataLambda',
			'save-cert-data-lambda',
			path.join(__dirname, 'lambda-functions/save-cert-data-lambda.ts'),
			dataHandlerLambdaRole,
			{
				templatesBucket: templatesBucket.bucketName,
				imagesBucket: staticFilesBucket.bucketName,
				certificatesBucket: certificatesBucket.bucketName,
				certDataTableName: certificateDataTable.tableName,
				pdfTemplateFile,
				certificatesPage,
				userTimeZone
			},
			256
		);

		const getDataLambda = stackUtils.lambda.createLambda(
			this,
			'GetCertDataLambda',
			'get-cert-data-lambda',
			path.join(__dirname, 'lambda-functions/get-cert-data-lambda.ts'),
			dataHandlerLambdaRole,
			{
				certDataTableName: certificateDataTable.tableName,
			}
		);

		const deleteDataLambda = stackUtils.lambda.createLambda(
			this,
			'DeleteCertDataLambda',
			'delete-cert-data-lambda',
			path.join(__dirname, 'lambda-functions/delete-cert-data-lambda.ts'),
			dataHandlerLambdaRole,
			{
				imagesBucket: staticFilesBucket.bucketName,
				certDataTableName: certificateDataTable.tableName,
			}
		);

		const scheduledDeletePdfLambda = stackUtils.lambda.createLambda(
			this,
			'DeletePdfLambda',
			'scheduled-delete-pdf-lambda',
			path.join(__dirname, 'lambda-functions/scheduled-delete-pdf-lambda.ts'),
			dataHandlerLambdaRole,
			{
				certificatesBucket: certificatesBucket.bucketName
			}
		)

		// EventBridge rule
		const twoWeeksBackupRule = new events.Rule(this, 'TwoWeeksBackupRule', {
			schedule: events.Schedule.expression('cron(0 4 ? * MON#2 *)'),
			description: 'Creates DynamoDB backup every two weeks on Monday at 4 AM'
		});
		twoWeeksBackupRule.addTarget(new targets.LambdaFunction(backupDynamoLambda));

		const weeklyRule = new events.Rule(this, 'WeeklyTriggerRule', {
			schedule: events.Schedule.cron({
				minute: '0',
        hour: '6',
        weekDay: '1'
			})
		});
		weeklyRule.addTarget(new targets.LambdaFunction(scheduledDeletePdfLambda));

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
