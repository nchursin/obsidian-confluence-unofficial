export interface Link {
	next?: string;
}

export interface AttachmentResult {
	id: string;
	type: string;
	status: string;
	title: string;
	createdAt: string;
	createdBy: {
		accountId: string;
		accountType: string;
		displayName: string;
		profilePicture: {
			path: string;
			width: number;
			height: number;
			isDefault: boolean;
		};
	};
	version: {
		by: {
			accountId: string;
			accountType: string;
			displayName: string;
			profilePicture: {
				path: string;
				width: number;
				height: number;
				isDefault: boolean;
			};
		};
		when: string;
		message: string;
		number: number;
		minorEdit: boolean;
	};
	extensions: {
		mediaType: string;
		fileSize: number;
		commentCount: number;
		metadata: {
			mediaType: string;
			fileSize: number;
		};
	};
	_expandable: {
		container: string;
		operations: string;
		children: string;
		history: string;
		ancestors: string;
		body: string;
		version: string;
		descendants: string;
		space: string;
	};
	_links: {
		thumbnail: string;
		self: string;
		download: string;
		webui: string;
	};
}

export class ConfluenceAttachmentsResponse {
	results: AttachmentResult[];
	start: number;
	limit: number;
	size: number;
	_links: Link;

	constructor(data: any) {
		this.results = data.results.map(
			(result: any) => new AttachmentResult(result),
		);
		this.start = data.start;
		this.limit = data.limit;
		this.size = data.size;
		this._links = data._links;
	}
}

export class AttachmentResult {
	id: string;
	type: string;
	status: string;
	title: string;
	createdAt: string;
	createdBy: {
		accountId: string;
		accountType: string;
		displayName: string;
		profilePicture: {
			path: string;
			width: number;
			height: number;
			isDefault: boolean;
		};
	};
	version: {
		by: {
			accountId: string;
			accountType: string;
			displayName: string;
			profilePicture: {
				path: string;
				width: number;
				height: number;
				isDefault: boolean;
			};
		};
		when: string;
		message: string;
		number: number;
		minorEdit: boolean;
	};
	extensions: {
		mediaType: string;
		fileSize: number;
		commentCount: number;
		metadata: {
			mediaType: string;
			fileSize: number;
		};
	};
	_expandable: {
		container: string;
		operations: string;
		children: string;
		history: string;
		ancestors: string;
		body: string;
		version: string;
		descendants: string;
		space: string;
	};
	_links: {
		thumbnail: string;
		self: string;
		download: string;
		webui: string;
	};

	constructor(data: any) {
		this.id = data.id;
		this.type = data.type;
		this.status = data.status;
		this.title = data.title;
		this.createdAt = data.createdAt;
		this.createdBy = data.createdBy;
		this.version = data.version;
		this.extensions = data.extensions;
		this._expandable = data._expandable;
		this._links = data._links;
	}
}
