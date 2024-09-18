import { aws_iam as iam } from 'aws-cdk-lib';

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

const iamUtils = {
	addCloudWatchPermissions,
	addS3Permissions,
	addDynamoPermissions
}

const stackUtils = {
	iam: iamUtils
}
export default stackUtils;
