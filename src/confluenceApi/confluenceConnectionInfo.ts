import { AuthTypes, ConfluencePlugin } from "src/interfaces";
import { Auth, ConfluenceAuthInfo } from "./client";

export class ConfluenceConnectionInfo implements ConfluenceAuthInfo {
	constructor(private readonly plugin: ConfluencePlugin) {}
	getURL(): string {
		return this.plugin.settings.confluenceUrl;
	}
	getAuth(): Auth {
		let authType: "BASIC" | "PAT" = "BASIC";
		if (this.plugin.settings.authType == AuthTypes.PAT) {
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
