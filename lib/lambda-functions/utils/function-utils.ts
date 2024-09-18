import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventHeaders
} from 'aws-lambda';
import busboy from 'busboy';
import moment from 'moment-timezone';
import { env } from 'process';
import {
  ResponseHeaders,
  ParsedFormData,
  CertificateData
} from '../../types';

const isEventValid = (headers: APIGatewayProxyEventHeaders): boolean | undefined => {
	console.log('Checking event header values...');
	const customHeaderName = env.lambdaCustomHeaderName ?? 'HeaderNameNotExist';
	const customHeaderValue = env.lambdaCustomHeaderValue ?? 'HeaderValueNotExist';

	const contentType = headers['Content-Type'] || headers['content-type'];
	const customHeader = headers[customHeaderName];

	return contentType?.startsWith('multipart/form-data') && customHeader?.startsWith(customHeaderValue);
}

const buildResponseHeaders = (): ResponseHeaders => {
  return {
    'Access-Control-Allow-Origin': env.allowedOrigin ?? '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': `Content-Type, ${env.lambdaCustomHeaderName}`
  }
}

const parseFormData = (event: APIGatewayProxyEvent): Promise<ParsedFormData> => {
	return new Promise((resolve, reject) => {
		console.log(`Busboy starting...`);

    const contentType = event.headers['Content-Type'] || event.headers['content-type'];
		const bus = busboy({
			headers: { 'content-type': contentType }
		});
    const result: ParsedFormData = {
      fields: {},
      image: {
        filename: '',
        content: undefined,
        contentType: ''
      },
      certId: crypto.randomUUID()
    };

		bus.on('field', (fieldname, value) => {
      console.log(`Bosboy parsing field ${fieldname} with value ${value}`);
      result.fields[fieldname] = value;
    });

		bus.on('file', (fieldname: any, file: any, filename: any, encoding: any, mimetype: any) => {
			let buffers: any[] = [];
      console.log(`Busboy encountered file ${filename} with mimetype ${mimetype}`);

			file.on('data', (data: any) => {
        buffers.push(data);
      });
			file.on('end', () => {
				result.image = {
          filename: filename,
          content: Buffer.concat(buffers),
          contentType: mimetype ?? 'image/png',
        };
			});
			file.on('error', (err: any) => {
        reject(new Error(`Error while processing file: ${filename}. Error: ${err?.message}`));
      });
		});

		bus.on('error', (err: any) => {
      reject(new Error(`Error while parsing form data: ${err?.message}`));
    });

		bus.on('finish', () => {
			console.log('Busboy finished...');
      resolve(result);
    });

    bus.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
    bus.end();
	});
}

const buildDynamoDocument = (fields: { [key: string]: string }, certificateId: string, bucketName: string): CertificateData => {
  const userTimeZone = env.userTimeZone ?? '';
  const userTime = moment.tz(userTimeZone).format();
  const localTime = moment().format();

  return {
    id: certificateId,
    clientName: fields['clientName'],
    heading: fields['heading'],
    imageLink: `https://${bucketName}.s3.${env.AWS_REGION}.amazonaws.com/${certificateId}.png`,
    createdAtUserTime: userTime,
    createdAtLocalTime: localTime
  }
}

const functionUtils = {
  isEventValid,
  buildResponseHeaders,
  parseFormData,
  buildDynamoDocument
}
export default functionUtils;
