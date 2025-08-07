export interface PageRequestBody {
	id?: string;
	type: "page";
	status: "current";
	title: string;
	space: {
		key: string;
	};
	ancestors: [
		{
			id: string;
		},
	];
	body: {
		storage: {
			value: string;
			representation: "storage";
		};
	};
	version?: {
		number: number;
	};
}

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
