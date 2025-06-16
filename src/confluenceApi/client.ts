import { requestUrl } from "obsidian";
import { PageInfo } from "src/model";
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
		const url = `${this.auth.getURL()}/api/content/${pageId}/child/attachment`;

		const urlResponse = await requestUrl({
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

		if (urlResponse.status != 200) {
			console.warn("error response: ", urlResponse.json);
			throw new Error(
				`Failed to upload attachmente ${urlResponse.json.message}`,
			);
		}

		const response = urlResponse.json;

		if (!response?.results?.length) {
			throw new Error(
				"No attachment returned from Confluence: " + urlResponse,
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
	}): Promise<[Attachment]> {
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

		const response = urlResponse.json;

		const attachments = response.results.map(
			(res: any): Attachment => ({
				id: res.id,
				name: res.title,
				links: res._links,
			}),
		);

		return attachments;
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
