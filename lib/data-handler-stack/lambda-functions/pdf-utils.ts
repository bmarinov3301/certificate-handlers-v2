import * as QRCode from 'qrcode'
import { PDFDocument } from 'pdf-lib';
import { env } from 'process';

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

const fillInPdfFormData = async (stream: NodeJS.ReadableStream, certId: string) : Promise<Buffer> => {
	const pdfBuffer = await streamToBuffer(stream);
	const certificatesPageEndpoint = env.pdfDataEndpoint ?? '';
	const qrCodeBuffer = await generateQRCode(`${certificatesPageEndpoint}?certId=${certId}`);
	
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
	const qrSize = 100;
	console.log(`XPos -> ${width}(width) - ${qrSize}(qrSize) - 50`);
	const xPos = width - qrSize - 50;
	console.log(`YPos -> ${height}(height) - ${qrSize}(qrSize) - 50`);
	const yPos = width - qrSize - 50;
	page.drawImage(qrCodeImage, {
		x: xPos,
		y: yPos,
		width: qrSize,
		height: qrSize
	});

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

const pdfUtils = {
	fillInPdfFormData
}
export default pdfUtils;
