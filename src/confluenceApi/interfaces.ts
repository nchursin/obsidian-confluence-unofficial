export interface ConfluenceAuthInfo {
	url: string;
	basic?: {
		username: string;
		token: string;
	};
	bearer?: {
		token: string;
	};
}

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
