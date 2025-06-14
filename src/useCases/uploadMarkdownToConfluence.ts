import { readFile } from "fs/promises";
import { MarkdownView } from "obsidian";
import * as path from "path";
import { ConfluenceClient } from "src/confluenceApi";
import { PageInfo } from "src/model";
import {
	convertMdToHtmlElement,
	downgradeFromHtml5,
} from "src/utils/htmlProcessor";

export class UploadMarkDownToConfluenceUseCase {
	constructor(private readonly confluenceClient: ConfluenceClient) {}

	public async uploadMarkdown(
		view: MarkdownView,
		destination: PageInfo,
	): Promise<PageInfo> {
		if (!view.file) {
			return destination;
		}

		const renderDiv = await convertMdToHtmlElement(view);

		if (!destination.pageId) {
			destination.version = 0;
		}

		const response: any = await this.confluenceClient.upsertPage({
			pageId: destination.pageId,
			spaceKey: destination.spaceKey,
			title: view.getDisplayText(),
			parentId: destination.parentId,
			htmlContent: downgradeFromHtml5(renderDiv.innerHTML),
			version: destination.version + 1,
		});

		destination.pageId = response.id;
		destination.version = response.version.number;

		const linkWrappers = renderDiv.getElementsByClassName(
			"internal-embed media-embed image-embed",
		);
		const images = Array.from(linkWrappers)
			.flatMap((wrapper) =>
				Array.from(wrapper.getElementsByTagName("img")),
			)
			.map((img) => img.attributes.getNamedItem("src")?.value || "");

		if (!images.length) {
			return destination;
		}

		const imagesSrcPlain = images.map((filePath) =>
			filePath?.replace(/app:\/\/\w+/, "").replace(/\?.+/, ""),
		);

		const atts = await Promise.all(
			imagesSrcPlain.map(async (filePath: string) => {
				const src = decodeURI(filePath || "");
				const contents = await readFile(src);
				const basename = path.basename(src);
				return this.confluenceClient.uploadImage(
					destination.pageId || "",
					basename,
					contents,
				);
			}),
		);

		let resultHtml = downgradeFromHtml5(renderDiv.innerHTML);
		atts.forEach((att, index) => {
			resultHtml = resultHtml.replace(
				images[index],
				att.links.download.replaceAll("&", "&amp;"),
			);
		});

		const response2: any = await this.confluenceClient.upsertPage({
			pageId: destination.pageId,
			spaceKey: destination.spaceKey,
			title: view.getDisplayText(),
			parentId: destination.parentId,
			htmlContent: resultHtml,
			version: destination.version ? destination.version + 1 : 1,
		});

		destination.version = response2.version.number;
		return destination;
	}
}
