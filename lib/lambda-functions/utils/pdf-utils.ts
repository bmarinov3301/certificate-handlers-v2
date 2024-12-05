import { PDFDocument } from 'pdf-lib';
import { env } from 'process';
import moment from 'moment';
import { Detail } from '../../types';

const userTimeZone = env.userTimeZone ?? '';

const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

const fillInPdfFormData = async (
	stream: NodeJS.ReadableStream,
	qrCodeBuffer: Buffer,
	certId: string,
	fields: { [key: string]: string },
	image: Buffer | undefined
) : Promise<Buffer> => {
	const pdfBuffer = await streamToBuffer(stream);

	const pdfDoc = await PDFDocument.load(pdfBuffer);
	const page = pdfDoc.getPage(0);


	// Add QR Code
	const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);
	const { width: pageWidth, height: pageHeight } = page.getSize();
	const qrSize = 115;
	const xPos = 80;
	const yPos = pageHeight - 180;
	page.drawImage(qrCodeImage, {
		x: xPos,
		y: yPos,
		width: qrSize,
		height: qrSize
	});


	// Set form field data
	const form = pdfDoc.getForm();

	const dateField = form.getTextField('date-placeholder');
	dateField.setText(moment.tz(userTimeZone).format('ll'));

	const clientNameField = form.getTextField('client-name-placeholder');
	clientNameField.setText(`To: ${fields['clientName']}`);

	const certIdPlaceholder = form.getTextField('certificate-num-placeholder');
	certIdPlaceholder.setText(certId);

	const headingPlaceholder = form.getTextField('heading-placeholder');
	headingPlaceholder.setText(fields['heading']);

	const outcomePlaceholder = form.getTextField('outcome-placeholder');
	outcomePlaceholder.setText(fields['outcome'] == 'true' ? 'AUTHENTIC' : 'NOT AUTHENTIC');

	if(fields['details']) {
		let detailsText = '';
		const details: Detail[] = JSON.parse(fields['details']);
		details.forEach((val: Detail) => {
			detailsText += `${val.detailName}: ${val.detailValue}\n`;
		});

		const detailsPlaceholder = form.getTextField('details-placeholder');
		detailsPlaceholder.setText(detailsText);
	}

	if (image) {
		const placeholderWidth = 538;
		const placeholderHeight = 380;
		const pdfImage = await pdfDoc.embedPng(image);
		const { width: imageWidth, height: imageHeight } = pdfImage.scale(1);

		let scaledWidth = imageWidth;
  	let scaledHeight = imageHeight;

		if (imageWidth > placeholderWidth) {
			const scaleFactor = placeholderWidth / imageWidth;
			scaledWidth = imageWidth * scaleFactor;
			scaledHeight = imageHeight * scaleFactor;
		}

		if (scaledHeight > placeholderHeight) {
			const heightScaleFactor = placeholderHeight / scaledHeight;
			scaledWidth = scaledWidth * heightScaleFactor;
			scaledHeight = scaledHeight * heightScaleFactor;
		}

		const centeredX = (pageWidth - scaledWidth) / 2;

		page.drawImage(pdfImage, {
			x: centeredX,
			y: 626 - scaledHeight,
			width: scaledWidth,
			height: scaledHeight
		});
	}

	form.flatten();
	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

const pdfUtils = {
	fillInPdfFormData
}
export default pdfUtils;
