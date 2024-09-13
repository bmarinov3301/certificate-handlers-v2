import { aws_iam as iam } from 'aws-cdk-lib';

export const addCloudWatchPermissions = (role: iam.Role): void => {
  role.addToPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
    resources: ['arn:aws:logs:*:*:*']
  }));
}

export const addS3Permissions = (role: iam.Role, bucketArn: string, actions: string[]): void => {
  role.addToPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: actions,
    resources: [bucketArn + '/*']
  }));
}

export const addDynamoPermissions = (role: iam.Role, tableArns: string[], actions: string[]): void => {
  role.addToPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
		actions: actions,
    resources: tableArns
  }));
}