import { Command, Editor, MarkdownView, Notice } from "obsidian";
import { ConfluencePlugin } from "src/interfaces";
import { ErrorModal } from "src/components/errorModal";
import { UploadMarkDownToConfluenceUseCase } from "src/useCases";

export const publishFile = (
	plugin: ConfluencePlugin,
	publishUseCase: UploadMarkDownToConfluenceUseCase,
): Command => ({
	id: "obsidian-confluence-unof-publish-file",
	name: "OCU: Publish File",
	editorCallback: async (_: Editor, view: MarkdownView) => {
		try {
			if (!view.file) {
				return;
			}
			new Notice("Uploading page to Confluence...");

			let pageId: string | undefined;
			let spaceKey: string | undefined;
			let version = 1;
			await plugin.app.fileManager.processFrontMatter(
				view.file,
				(fronmatter) => {
					pageId = fronmatter.confluence_page_id;
					spaceKey = fronmatter.confluence_space;
					version = fronmatter.confluence_page_version;
				},
			);

			if (!spaceKey) {
				spaceKey = plugin.settings.spaceKey;
			}

			const resultPage = await publishUseCase.uploadMarkdown(view, {
				pageId,
				version,
				spaceKey,
				parentId: plugin.settings.parentId,
			});

			await plugin.app.fileManager.processFrontMatter(
				view.file,
				(fronmatter) => {
					fronmatter.confluence_page_id = resultPage.pageId;
					fronmatter.confluence_space = resultPage.spaceKey;
					fronmatter.confluence_page_version = resultPage.version;
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
