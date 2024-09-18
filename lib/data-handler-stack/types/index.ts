interface UploadedImage {
  filename: string,
  content: Buffer,
  contentType: string
}

export interface ParsedFormData {
  fields: {
    [key: string]: string
  }
  files: UploadedImage[]
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
