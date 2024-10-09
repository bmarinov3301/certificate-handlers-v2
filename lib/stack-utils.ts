import { Construct } from 'constructs';
import {
  Duration,
  aws_iam as iam,
  aws_lambda as lambda
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  lambdaCustomHeaderName,
  lambdaCustomHeaderValue,
  resourcePrefix,
  restApiAllowedOrigins
} from './constants';

// IAM
const addCloudWatchPermissions = (role: iam.Role): void => {
  role.addToPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
    resources: ['arn:aws:logs:*:*:*']
  }));
}

const addS3Permissions = (role: iam.Role, bucketArn: string, actions: string[]): void => {
  role.addToPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: actions,
    resources: [bucketArn + '/*']
  }));
  role.addToPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['s3:ListBucket'],
    resources: [bucketArn]
  }));
}

const addDynamoPermissions = (role: iam.Role, tableArns: string[], actions: string[]): void => {
  role.addToPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
		actions: actions,
    resources: tableArns
  }));
}

// Lambda
const createLambda = (
  scope: Construct,
  id: string,
  functionName: string,
  entryPath: string,
  iamRole: iam.IRole,
  environment: any,
  memorySize: number = 128
): NodejsFunction => {
  const lambdaFunction = new NodejsFunction(scope, id, {
    functionName: `${resourcePrefix}-${functionName}`,
    runtime: lambda.Runtime.NODEJS_20_X,
    timeout: Duration.seconds(30),
    entry: entryPath,
    role: iamRole,
    environment: {
      lambdaCustomHeaderName,
			lambdaCustomHeaderValue,
      allowedOrigin: restApiAllowedOrigins[0],
      ...environment
    },
    memorySize: memorySize,
  });

  return lambdaFunction;
}

const iamUtils = {
	addCloudWatchPermissions,
	addS3Permissions,
	addDynamoPermissions
}

const lambdaUtils = {
  createLambda
}

const stackUtils = {
	iam: iamUtils,
  lambda: lambdaUtils
}
export default stackUtils;
