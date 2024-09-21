import * as QRCode from 'qrcode'
import { PDFDocument, rgb } from 'pdf-lib';
import { env } from 'process';
import moment from 'moment';

const userTimeZone = env.userTimeZone ?? '';
const certificatesPage = env.certificatesPage ?? '';

const generateQRCode = async (url: string) : Promise<Buffer> => {
	return QRCode.toBuffer(url);
}

const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

const fillInPdfFormData = async (stream: NodeJS.ReadableStream, certId: string, fields: { [key: string]: string }) : Promise<Buffer> => {
	const pdfBuffer = await streamToBuffer(stream);
	const qrCodeBuffer = await generateQRCode(`${certificatesPage}?certId=${certId}`);
	
	const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
	const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);
	const page = pdfDoc.getPage(0);

	// Add QR Code
	const { width, height } = page.getSize();
	const qrSize = 115;
	const xPos = 80;
	const yPos = height - 180;
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

	form.flatten();
	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

const pdfUtils = {
	fillInPdfFormData
}
export default pdfUtils;
