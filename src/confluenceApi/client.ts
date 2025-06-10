import { request } from "obsidian";

interface ConfluenceAuthInfo {
	url: string;
	basic?: {
		username: string;
		token: string;
	};
	bearer?: {
		token: string;
	};
}

interface ConfluencePage {
	title: string;
	spaceKey: string;
	parentId: string;
	htmlContent?: string;
	adf?: any;
}

export class ConfluenceClient {
	constructor(private readonly auth: ConfluenceAuthInfo) {}

	async upsertPage(page: ConfluencePage): Promise<any> {
		const body = {
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

		return request({
			url: `${this.auth.url}/rest/api/content`,
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=UTF-8",
				"X-Atlassian-Token": "nocheck",
				"User-Agent": "dummy",
				Accept: "application/json",
				Authorization: `Bearer ${this.auth.bearer?.token}`,
			},
			body: JSON.stringify(body),
		});
	}
}
