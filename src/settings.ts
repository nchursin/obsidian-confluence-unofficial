import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

type ValueOf<T> = T[keyof T];

const AuthTypes = {
	BASIC: "Basic",
	PAT: "Personal App Token",
};

type AuthType = ValueOf<typeof AuthTypes>;

// Remember to rename these classes and interfaces!
export interface ConfluenceIntegrationSettings {
	confluenceUrl: string;
	authType: AuthType;
	username: string;
	token: string;
}

export const DEFAULT_SETTINGS: ConfluenceIntegrationSettings = {
	confluenceUrl: "",
	authType: "",
	username: "",
	token: "",
};

interface ConfluencePlugin extends Plugin {
	settings: ConfluenceIntegrationSettings;
}

export class ConfluenceSettingsTab extends PluginSettingTab {
	plugin: ConfluencePlugin;

	constructor(app: App, plugin: ConfluencePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Confluence URL")
			.setDesc("Enter URL of your instance of Confluence")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Confluence URL")
					.setValue(this.plugin.settings.confluenceUrl)
					.onChange(async (value) => {
						this.plugin.settings.confluenceUrl = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName("Auth Type")
			.setDesc("Choose Auth Type")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						...AuthTypes,
					})
					.setValue(this.plugin.settings.authType)
					.onChange(async (value) => {
						this.plugin.settings.authType = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName("Username")
			.setDesc("Required for Basic Auth")
			.addText((text) =>
				text
					.setPlaceholder("john@doe.com")
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName("Token")
			.setDesc("App Token or Atlassian Token")
			.addText((text) =>
				text
					.setPlaceholder("secret")
					.setValue(this.plugin.settings.token)
					.onChange(async (value) => {
						this.plugin.settings.token = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);
	}
}
