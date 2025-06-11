import { Command, Editor, MarkdownView } from "obsidian";
import { convertMdToHtml } from "src/utils/htmlProcessor";
import { ConfluenceClient } from "src/confluenceApi/client";
import { ConfluencePlugin } from "src/interfaces";

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
			htmlContent: await convertMdToHtml(
				plugin.app,
				view.getViewData(),
				view,
			),
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
