# TypeScript PDF certificate creation project
## Project overview
This project is deployed to a live environment as an extension of a wordpress website. The purpose of the application is to accept a form data request sent from a private (admin accessible) page so users on the site can access their certificates after purchasing them. The application automates storing of the certificate data and generating the PDF certificate which is later sent to users and made accessible by them.

## Project functionality
- Accept form data sent from a client (browser)
- Generate a QR code with the certificate URL
- Save data to DynamoDB
- Save image and QR code data to S3
- Fill in a PDF template with the data
- Return the completed PDF file to the client for the admin user to download

## AWS Infrastructure used
The project is developed to integrate with AWS. Infrastructure is developed, maintained and deployed via AWS CDK. Services include:
- API Gateway
- Lambda
- CloudWatch
- DynamoDB
- S3

## Important!
The **lib/constants.ts** file is left empty in order to not include sensitive information in the public repository about the deployed application. The data needs to filled out in order to setup and deploy this solution.
