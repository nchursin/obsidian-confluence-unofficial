import { ConfluencePlugin } from "src/interfaces";
import { Auth, ConfluenceAuthInfo } from "./client";

export class ConfluenceConnectionInfo implements ConfluenceAuthInfo {
	constructor(private readonly plugin: ConfluencePlugin) {}
	getURL(): string {
		return `${this.plugin.settings.confluenceUrl}/${this.plugin.settings.apiPrefix}`;
	}
	getAuth(): Auth {
		let authType: "BASIC" | "PAT" = "BASIC";
		if (this.plugin.settings.authType == "PAT") {
			authType = "PAT";
		}
		return {
			type: authType,
			basic: {
				username: this.plugin.settings.username,
				token: this.plugin.settings.token,
			},
			bearer: {
				token: this.plugin.settings.token,
			},
		};
	}
}
