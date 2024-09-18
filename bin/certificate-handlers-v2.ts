#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CertificateHandlersV2Stack } from '../lib/certificate-handlers-v2-stack';

const app = new cdk.App();
new CertificateHandlersV2Stack(app, 'CertificateHandlersV2Stack');