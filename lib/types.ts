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
	imageUrl: string,
	createdAtUserTime: string,
	createdAtLocalTime: string,
  displayDate: string,
  [key: string]: string;
}

export interface Detail {
  detailName: string,
  detailValue: string
}
