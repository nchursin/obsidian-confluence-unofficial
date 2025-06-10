import {
	App,
	Command,
	Component,
	Editor,
	MarkdownRenderer,
	MarkdownView,
} from "obsidian";
import { ConfluenceClient } from "../confluenceApi/client";
import { ConfluencePlugin } from "../interfaces";

const getHtml = async (app: App, md: string, view: MarkdownView) => {
	const component = new Component();
	component.load();
	const renderDiv = view.contentEl.createEl("div", {});
	await MarkdownRenderer.render(app, md, renderDiv, "nop", component);

	return renderDiv.innerHTML;
};

export const publishFile = (plugin: ConfluencePlugin): Command => ({
	id: "obsidian-confluence-unof-publish-file",
	name: "OCU: Publish File",
	editorCallback: async (editor: Editor, view: MarkdownView) => {
		const confluenceClient = new ConfluenceClient({
			url: plugin.settings.confluenceUrl,
			bearer: {
				token: plugin.settings.token,
			},
		});

		await confluenceClient.upsertPage({
			spaceKey: plugin.settings.spaceKey,
			title: view.getDisplayText(),
			parentId: plugin.settings.parentId,
			htmlContent: await getHtml(plugin.app, view.getViewData(), view),
		});
	},
});
