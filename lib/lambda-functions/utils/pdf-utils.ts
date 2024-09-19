import * as QRCode from 'qrcode'
import { PDFDocument, rgb } from 'pdf-lib';
import { env } from 'process';
import moment from 'moment';

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
	const certificatesPage = env.certificatesPage ?? '';
	const qrCodeBuffer = await generateQRCode(`${certificatesPage}?certId=${certId}`);
	
	const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
	const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);
	// const [page] = pdfDoc.getPages();
	// page.drawImage(qrCodeImage, {
	// 	x: 78,
	// 	y: 868,
	// 	width: 100,
	// 	height: 100
	// });

	const page = pdfDoc.getPage(0);
	const { width, height } = page.getSize();
	const qrSize = 115;
	console.log(`XPos -> ${width}(width) - ${qrSize}(qrSize) - 50`);
	const xPos = 80;
	console.log(`YPos -> ${height}(height) - ${qrSize}(qrSize) - 50`);
	const yPos = height - 180;
	page.drawImage(qrCodeImage, {
		x: xPos,
		y: yPos,
		width: qrSize,
		height: qrSize
	});
	const form = pdfDoc.getForm();
	const dateField = form.getTextField('date-placeholder');
	const userTimeZone = env.userTimeZone ?? '';
	page.drawText(moment.tz(userTimeZone).format('ll'), {
		x: 77,
		y: 813,
		size: 10,
		color: rgb(74, 75, 76)
	});
  // dateField.setText(moment.tz(userTimeZone).format('ll'));
	const clientNameField = form.getTextField('client-name-placeholder');
	clientNameField.setText(`To: ${fields['clientName']}`);

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

const pdfUtils = {
	fillInPdfFormData
}
export default pdfUtils;
