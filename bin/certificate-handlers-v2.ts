#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataHandlerStack } from '../lib/data-handler-stack';
import { RestApiStack } from '../lib/api-stack';

const app = new cdk.App();
const dataHandlerStack = new DataHandlerStack(app, 'DataHandlerStack', {});
const apiGatewayStack = new RestApiStack(app, 'RestApiStack', {
	dataHandlerLambda: dataHandlerStack.lambda
});