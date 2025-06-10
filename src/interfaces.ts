import { Plugin } from "obsidian";

export const AuthTypes = {
	BASIC: "Basic",
	PAT: "Personal App Token",
};

type ValueOf<T> = T[keyof T];

type AuthType = ValueOf<typeof AuthTypes>;

export interface ConfluenceIntegrationSettings {
	confluenceUrl: string;
	authType: AuthType;
	username: string;
	token: string;
	spaceKey: string;
	parentId: string;
}

export interface ConfluencePlugin extends Plugin {
	settings: ConfluenceIntegrationSettings;
}
