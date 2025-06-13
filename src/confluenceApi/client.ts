import { request } from "obsidian";
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

export class ConfluenceClient {
	constructor(private readonly auth: ConfluenceAuthInfo) {}

	async upsertPage(page: ConfluencePage): Promise<any> {
		console.log("page.htmlContent >> ", page.htmlContent);

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

		let url = `${this.auth.getURL()}/rest/api/content`;
		let method = "POST";
		if (page.pageId) {
			body.id = page.pageId;
			body.version = {
				number: page.version,
			};
			url += `/${page.pageId}`;
			method = "PUT";
		}

		const response = await request({
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
		});

		return JSON.parse(response);
	}

	async uploadImage(
		pageId: string,
		fileName: string,
		fileData: ArrayBuffer | Uint8Array,
	): Promise<Attachment> {
		const boundary =
			"----ObsConfluenceBoundary" + Math.random().toString(16).slice(2);
		const strToUint8 = (str: string): Uint8Array =>
			new TextEncoder().encode(str);
		const CRLF = "\r\n";
		const preamble =
			`--${boundary}${CRLF}` +
			`Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
			`Content-Type: application/octet-stream${CRLF}${CRLF}`;
		const postamble = `${CRLF}--${boundary}--${CRLF}`;
		const preambleBytes = strToUint8(preamble);
		const postambleBytes = strToUint8(postamble);
		const fileBytes =
			fileData instanceof Uint8Array
				? fileData
				: new Uint8Array(fileData);
		const totalLength =
			preambleBytes.length + fileBytes.length + postambleBytes.length;
		const bodyBytes = new Uint8Array(totalLength);
		bodyBytes.set(preambleBytes, 0);
		bodyBytes.set(fileBytes, preambleBytes.length);
		bodyBytes.set(postambleBytes, preambleBytes.length + fileBytes.length);
		const url = `${this.auth.getURL()}/rest/api/content/${pageId}/child/attachment`;
		const responseText = await request({
			url,
			method: "POST",
			headers: {
				"Content-Type": `multipart/form-data; boundary=${boundary}`,
				"X-Atlassian-Token": "nocheck",
				"User-Agent": "dummy",
				Accept: "application/json",
				Authorization: getAuthHeader(this.auth),
			},
			body: bodyBytes.buffer,
		});
		console.log("responseText >> ", responseText);
		let response;
		try {
			response = JSON.parse(responseText);
		} catch (e) {
			throw new Error(
				"Failed to parse Confluence upload response: " + responseText,
			);
		}
		if (!response?.results?.length) {
			throw new Error(
				"No attachment returned from Confluence: " + responseText,
			);
		}
		const attachment = response.results[0];
		console.log("attachment >> ", attachment);
		return {
			id: attachment.id,
			name: attachment.title,
			links: attachment._links,
		};
	}
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
