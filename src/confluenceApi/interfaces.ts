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
