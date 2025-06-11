import { Command, Editor, MarkdownView, Notice } from "obsidian";
import { convertMdToHtml } from "src/utils/htmlProcessor";
import { ConfluenceClient } from "src/confluenceApi";
import { ConfluencePlugin } from "src/interfaces";
import { ErrorModal } from "src/components/errorModal";

export const publishFile = (
	plugin: ConfluencePlugin,
	confluenceClient: ConfluenceClient,
): Command => ({
	id: "obsidian-confluence-unof-publish-file",
	name: "OCU: Publish File",
	editorCallback: async (editor: Editor, view: MarkdownView) => {
		try {
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
					fronmatter.confluence_page_version =
						response.version.number;
				},
			);
			new Notice("The file is successfully published!");
		} catch (err) {
			console.error(err);
			// new Notice("err happened");
			new ErrorModal(
				plugin.app,
				new Error(`error occured during publishing page: ${err}`),
			).open();
		}
	},
});
