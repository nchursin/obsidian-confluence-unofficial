import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { AuthTypes, ConfluenceIntegrationSettings } from "./interfaces";

export const DEFAULT_SETTINGS: ConfluenceIntegrationSettings = {
	confluenceUrl: "",
	authType: "",
	username: "",
	token: "",
	spaceKey: "",
	parentId: "",
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
						this.display();
					}),
			);

		if (this.plugin.settings.authType != "PAT") {
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
		}

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

		new Setting(containerEl).setName("Space Key").addText((text) =>
			text
				.setPlaceholder("SPACE")
				.setValue(this.plugin.settings.spaceKey)
				.onChange(async (value) => {
					this.plugin.settings.spaceKey = value;
					await this.plugin.saveData(this.plugin.settings);
				}),
		);

		new Setting(containerEl).setName("Parent Page ID").addText((text) =>
			text
				.setPlaceholder("123")
				.setValue(this.plugin.settings.parentId)
				.onChange(async (value) => {
					this.plugin.settings.parentId = value;
					await this.plugin.saveData(this.plugin.settings);
				}),
		);
	}
}
