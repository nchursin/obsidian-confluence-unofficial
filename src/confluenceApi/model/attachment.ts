export interface Attachment {
	id: string;
	name: string;
	links: {
		webui: string;
		download: string;
		thumbnail: string;
		self: string;
	};
}
