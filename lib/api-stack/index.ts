import { Construct } from 'constructs';
import {
	Stack,
	StackProps
} from 'aws-cdk-lib';
import {
  RestApi,
  LambdaIntegration,
  Cors
} from 'aws-cdk-lib/aws-apigateway';
import {
	resourcePrefix,
	restApiAllowedOrigins,
	lambdaCustomHeaderName
} from '../constants';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface Props extends StackProps {
	dataHandlerLambda: NodejsFunction
}

export class RestApiStack extends Stack {
	public readonly imagesBucketName: string;
	public readonly certificateDataTableName: string;

	constructor(scope: Construct, id: string, props: Props) {
		super(scope, id, props);

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
    uploadDataResource.addMethod('POST', new LambdaIntegration(props.dataHandlerLambda));
	}
}
