import { request } from "obsidian";
import { PageRequestBody } from "./interfaces";

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

	async upsertPage(page: ConfluencePage): Promise<string> {
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

		return request({
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
