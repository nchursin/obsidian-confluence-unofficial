import { LocalUploadedFile } from "src/model";

export interface HtmlProcessor {
	prepareHtml(html: HTMLElement, attachments: LocalUploadedFile[]): string;
}
