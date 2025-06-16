import { Attachment } from "src/confluenceApi/model";

export interface PageInfo {
	pageId?: string;
	parentId: string;
	spaceKey: string;
	version: number;
}

export interface LocalUploadedFile {
	attachmentInfo?: Attachment;
	localPath: string;
	unescapedPath: string;
	imgElement: HTMLElement;
}
