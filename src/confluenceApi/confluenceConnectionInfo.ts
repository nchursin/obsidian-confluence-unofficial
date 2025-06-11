import { ConfluencePlugin } from "src/interfaces";
import { Auth, ConfluenceAuthInfo } from "./client";

export class ConfluenceConnectionInfo implements ConfluenceAuthInfo {
	constructor(private readonly plugin: ConfluencePlugin) {}
	getURL(): string {
		return this.plugin.settings.confluenceUrl;
	}
	getAuth(): Auth {
		return {
			type: "PAT",
			bearer: {
				token: this.plugin.settings.token,
			},
		};
	}
}
