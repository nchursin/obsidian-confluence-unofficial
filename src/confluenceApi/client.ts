import { requestUrl } from "obsidian";
import { PageInfo } from "src/model";
import { ConfluenceAttachmentsResponse } from "./confluenceModel";
import { PageRequestBody } from "./interfaces";
import { Attachment } from "./model";

export interface ConfluencePage {
	pageId?: string;
	title: string;
	spaceKey: string;
	parentId: string;
	htmlContent: string;
	version: number;
}

export interface ConfluenceAuthInfo {
	getURL(): string;
	getAuth(): Auth;
}

export interface Auth {
	type: "BASIC" | "PAT";
	basic?: {
		username: string;
		token: string;
	};
	bearer?: {
		token: string;
	};
}

const CRLF = "\r\n";

function createBoundary(): string {
	return "----ObsConfluenceBoundary" + Math.random().toString(16).slice(2);
}

function strToUint8(str: string): Uint8Array {
	return new TextEncoder().encode(str);
}

function createPreamble(boundary: string, fileName: string): Uint8Array {
	const preamble = `--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}Content-Type: application/octet-stream${CRLF}${CRLF}`;
	return strToUint8(preamble);
}

function createPostamble(boundary: string): Uint8Array {
	return strToUint8(`${CRLF}--${boundary}--${CRLF}`);
}

function createBodyBytes(
	preambleBytes: Uint8Array,
	fileBytes: Uint8Array,
	postambleBytes: Uint8Array,
): Uint8Array {
	const totalLength =
		preambleBytes.length + fileBytes.length + postambleBytes.length;
	const bodyBytes = new Uint8Array(totalLength);
	bodyBytes.set(preambleBytes, 0);
	bodyBytes.set(fileBytes, preambleBytes.length);
	bodyBytes.set(postambleBytes, preambleBytes.length + fileBytes.length);
	return bodyBytes;
}

const getAuthHeader = (connectionInfo: ConfluenceAuthInfo): string => {
	const auth = connectionInfo.getAuth();
	if (auth.type == "BASIC") {
		if (!auth.basic?.username) {
			throw new Error("Username is required for Basic auth!");
		}
		if (!auth.basic?.token) {
			throw new Error("Password/token is required for Basic auth!");
		}
		const credentials = `${auth.basic?.username}:${auth.basic?.token}`;
		return `Basic ${Buffer.from(credentials).toString("base64")}`;
	} else {
		return `Bearer ${auth.bearer?.token}`;
	}
};

export class ConfluenceClient {
	constructor(private readonly auth: ConfluenceAuthInfo) {}

	async upsertPage(page: ConfluencePage): Promise<PageInfo> {
		const body: PageRequestBody = {
			type: "page",
			status: "current",
			title: page.title,
			space: {
				key: page.spaceKey,
			},
			ancestors: [
				{
					id: page.parentId,
				},
			],
			body: {
				storage: {
					value: page.htmlContent,
					representation: "storage",
				},
			},
		};

		let url = `${this.auth.getURL()}/api/content`;
		let method = "POST";
		if (page.pageId) {
			body.id = page.pageId;
			body.version = {
				number: page.version,
			};
			url += `/${page.pageId}`;
			method = "PUT";
		}

		const urlResponse = await requestUrl({
			url,
			method,
			headers: {
				"Content-Type": "application/json; charset=UTF-8",
				"X-Atlassian-Token": "nocheck",
				"User-Agent": "dummy",
				Accept: "application/json",
				Authorization: getAuthHeader(this.auth),
			},
			body: JSON.stringify(body),
			throw: false,
		});

		if (urlResponse.status === 200) {
			const response = urlResponse.json;

			return {
				pageId: response.id,
				parentId: response.parentId,
				spaceKey: page.spaceKey,
				version: response.version.number,
			};
		} else {
			console.warn("error response: ", urlResponse.json);
			throw new Error(
				`Failed to upsert page: ${urlResponse.json.message}`,
			);
		}
	}

	async uploadImage(
		pageId: string,
		fileName: string,
		fileData: ArrayBuffer | Uint8Array,
	): Promise<Attachment> {
		const boundary = createBoundary();
		const preambleBytes = createPreamble(boundary, fileName);
		const postambleBytes = createPostamble(boundary);
		const fileBytes =
			fileData instanceof Uint8Array
				? fileData
				: new Uint8Array(fileData);
		const bodyBytes = createBodyBytes(
			preambleBytes,
			fileBytes,
			postambleBytes,
		);

		const url = `${this.auth.getURL()}/api/content/${pageId}/child/attachment`;
		const headers = {
			"Content-Type": `multipart/form-data; boundary=${boundary}`,
			"X-Atlassian-Token": "nocheck",
			"User-Agent": "dummy",
			Accept: "application/json",
			Authorization: getAuthHeader(this.auth),
		};

		const urlResponse = await requestUrl({
			url,
			method: "POST",
			headers,
			body: bodyBytes.buffer,
		});

		if (urlResponse.status !== 200) {
			console.warn("Error response:", urlResponse.json);
			throw new Error(
				`Failed to upload attachment: ${urlResponse.json.message}`,
			);
		}

		const response = urlResponse.json;

		if (!response?.results?.length) {
			throw new Error(
				`No attachment returned from Confluence: ${JSON.stringify(urlResponse)}`,
			);
		}

		const attachment = response.results[0];
		return {
			id: attachment.id,
			name: attachment.title,
			links: attachment._links,
		};
	}

	async getAttachments({
		pageId,
	}: {
		pageId: string;
	}): Promise<Attachment[]> {
		const url = `${this.auth.getURL()}/api/content/${pageId}/child/attachment?limit=100`;

		const urlResponse = await requestUrl({
			url,
			method: "GET",
			headers: {
				"Content-Type": "application/json; charset=UTF-8",
				"X-Atlassian-Token": "nocheck",
				"User-Agent": "dummy",
				Accept: "application/json",
				Authorization: getAuthHeader(this.auth),
			},
		});

		if (urlResponse.status != 200) {
			console.warn("error response: ", urlResponse.json);
			throw new Error(
				`Failed to get attachments: ${urlResponse.json.message}`,
			);
		}

		const response: ConfluenceAttachmentsResponse = urlResponse.json;

		const attachments = response.results.map(
			(res): Attachment => ({
				id: res.id,
				name: res.title,
				links: {
					download: res._links.download,
					self: res._links.self,
					thumbnail: res._links.thumbnail,
					webui: res._links.webui,
				},
			}),
		);

		return attachments;
	}
}
