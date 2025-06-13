import { Command, Editor, MarkdownView, Notice } from "obsidian";
import { convertMdToHtmlEl, downgradeFromHtml5 } from "src/utils/htmlProcessor";
import { ConfluenceClient } from "src/confluenceApi";
import { ConfluencePlugin } from "src/interfaces";
import { ErrorModal } from "src/components/errorModal";
import { readFile } from "fs/promises";
import * as path from "path";

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

			const renderDiv = await convertMdToHtmlEl(
				plugin.app,
				view.getViewData(),
				view,
			);

			const response: any = await confluenceClient.upsertPage({
				pageId: pageId,
				spaceKey: spaceKey || plugin.settings.spaceKey,
				title: view.getDisplayText(),
				parentId: plugin.settings.parentId,
				htmlContent: downgradeFromHtml5(renderDiv.innerHTML),
				version: version ? version + 1 : 1,
			});

			await plugin.app.fileManager.processFrontMatter(
				view.file,
				(fronmatter) => {
					fronmatter.confluence_page_id = response.id;
					fronmatter.confluence_space = response.space.key;
					fronmatter.confluence_page_version =
						response.version.number;
					pageId = response.id;
					spaceKey = response.space.key;
					version = response.version.number;
				},
			);

			const linkWrappers = renderDiv.getElementsByClassName(
				"internal-embed media-embed image-embed",
			);
			const images = Array.from(linkWrappers)
				.flatMap((wrapper) =>
					Array.from(wrapper.getElementsByTagName("img")),
				)
				.map((img) => img.attributes.getNamedItem("src")?.value || "");

			const imagesSrcPlain = images.map((filePath) =>
				filePath?.replace(/app:\/\/\w+/, "").replace(/\?.+/, ""),
			);

			console.log("imagesSrcPlain >> ", imagesSrcPlain);
			const atts = await Promise.all(
				imagesSrcPlain.map(async (filePath: string) => {
					const src = decodeURI(filePath || "");
					const contents = await readFile(src);
					const basename = path.basename(src);
					console.log("contents >> ", contents);
					return confluenceClient.uploadImage(
						pageId || "",
						basename,
						contents,
					);
				}),
			);
			console.log("atts >> ", atts);

			let resultHtml = downgradeFromHtml5(renderDiv.innerHTML);
			atts.forEach((att, index) => {
				console.log(`images[index] >> `, images[index]);
				console.log(`att.links.self >> `, att.links.self);
				resultHtml = resultHtml.replace(
					images[index],
					att.links.download.replaceAll("&", "&amp;"),
				);
			});

			const response2: any = await confluenceClient.upsertPage({
				pageId: pageId,
				spaceKey: spaceKey || plugin.settings.spaceKey,
				title: view.getDisplayText(),
				parentId: plugin.settings.parentId,
				htmlContent: resultHtml,
				version: version ? version + 1 : 1,
			});

			await plugin.app.fileManager.processFrontMatter(
				view.file,
				(fronmatter) => {
					fronmatter.confluence_page_id = response.id;
					fronmatter.confluence_space = response.space.key;
					fronmatter.confluence_page_version =
						response2.version.number;
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
