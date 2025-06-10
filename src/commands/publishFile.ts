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

	return renderDiv.innerHTML
		.replace(/<img([^>]*)>/g, function (match, attributes) {
			// Check if it's already properly closed
			if (match.trim().endsWith("/>")) {
				return match;
			}
			// Otherwise close it properly
			return `<img${attributes} />`;
		})
		.replace(/<br>/g, function (match, attributes) {
			return `<br/>`;
		});
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

		if (!view.file) {
			return;
		}
		let pageId, spaceKey;
		let version = 1;
		await plugin.app.fileManager.processFrontMatter(
			view.file,
			(fronmatter) => {
				pageId = fronmatter.confluence_page_id;
				spaceKey = fronmatter.confluence_space;
				version = fronmatter.confluence_page_version;
			},
		);

		const stringResponse = await confluenceClient.upsertPage({
			pageId: pageId,
			spaceKey: spaceKey || plugin.settings.spaceKey,
			title: view.getDisplayText(),
			parentId: plugin.settings.parentId,
			htmlContent: await getHtml(plugin.app, view.getViewData(), view),
			version: version ? version + 1 : 1,
		});

		const response = JSON.parse(stringResponse);

		await plugin.app.fileManager.processFrontMatter(
			view.file,
			(fronmatter) => {
				fronmatter.confluence_page_id = response.id;
				fronmatter.confluence_space = response.space.key;
				fronmatter.confluence_page_version = response.version.number;
			},
		);
	},
});
