export interface UploadedImage {
  filename: string,
  content: Buffer | undefined,
  contentType: string
}

export interface ParsedFormData {
  fields: {
    [key: string]: string
  }
  image: UploadedImage,
	certId: string
}

export interface ResponseHeaders {
    [header: string]: string | number | boolean
}

export interface CertificateData {
	id: string,
	clientName: string,
	heading: string,
	imageLink: string
}
