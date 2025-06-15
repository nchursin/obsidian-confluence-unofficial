import { readFile } from "fs/promises";
import { MarkdownView } from "obsidian";
import * as path from "path";
import { basename } from "path";
import { ConfluenceClient } from "src/confluenceApi";
import { Attachment } from "src/confluenceApi/model";
import { PageInfo } from "src/model";
import {
	convertMdToHtmlElement,
	downgradeFromHtml5,
} from "src/utils/htmlProcessor";

interface LocalUploadedFile {
	attachmentInfo?: Attachment;
	localPath: string;
	unescapedPath: string;
}

export class UploadMarkDownToConfluenceUseCase {
	constructor(private readonly confluenceClient: ConfluenceClient) {}

	public async uploadMarkdown(
		view: MarkdownView,
		destination: PageInfo,
	): Promise<PageInfo> {
		if (!view.file) {
			return destination;
		}

		return destination.pageId
			? this.updatePage(view, destination)
			: this.uploadNewPage(view, destination);
	}

	private async updatePage(
		view: MarkdownView,
		destination: PageInfo,
	): Promise<PageInfo> {
		const renderDiv = await convertMdToHtmlElement(view);

		const atts = await this.extractAttachments(renderDiv, destination);

		return this.upsertPage(
			renderDiv,
			view.getDisplayText(),
			destination,
			atts,
		);
	}

	private async uploadNewPage(
		view: MarkdownView,
		destination: PageInfo,
	): Promise<PageInfo> {
		const renderDiv = await convertMdToHtmlElement(view);

		const response: PageInfo = await this.upsertPage(
			renderDiv,
			view.getDisplayText(),
			destination,
			[],
		);

		destination.pageId = response.pageId;
		destination.version = response.version;

		const atts = await this.extractAttachments(renderDiv, destination);

		if (!atts.length) {
			return destination;
		}

		return this.upsertPage(
			renderDiv,
			view.getDisplayText(),
			destination,
			atts,
		);
	}

	private async extractAttachments(
		html: HTMLElement,
		pageMeta: PageInfo,
	): Promise<LocalUploadedFile[]> {
		if (!pageMeta.pageId) {
			return [];
		}

		const existingAttachments = await this.confluenceClient.getAttachments({
			pageId: pageMeta.pageId,
		});

		const linkWrappers = html.getElementsByClassName(
			"internal-embed media-embed image-embed",
		);
		const images = Array.from(linkWrappers)
			.flatMap((wrapper) =>
				Array.from(wrapper.getElementsByTagName("img")),
			)
			.map((img) => img.attributes.getNamedItem("src")?.value || "");

		const imagesSrcPlain = images
			.map(
				(filePath): LocalUploadedFile => ({
					localPath: filePath,
					unescapedPath: filePath,
				}),
			)
			.map((file) => ({
				...file,
				localPath: decodeURI(
					file.localPath
						?.replace(/app:\/\/\w+/, "")
						.replace(/\?.+/, ""),
				),
			}));

		const localFiles: LocalUploadedFile[] = imagesSrcPlain.map(
			(src: LocalUploadedFile) => {
				const filename = basename(src.localPath);
				const attachmentInfo = existingAttachments.find(
					(att: Attachment) => att.name === filename,
				);
				if (attachmentInfo) {
					attachmentInfo.links.download =
						attachmentInfo?.links.download.replaceAll("&amp;", "&");
				}
				return {
					...src,
					attachmentInfo,
				};
			},
		);

		const atts: LocalUploadedFile[] = await Promise.all(
			localFiles.map(async (file: LocalUploadedFile) => {
				if (file.attachmentInfo) {
					return file;
				}
				const src = file.localPath;
				const contents = await readFile(src);
				const basename = path.basename(src);
				const attachmentInfo = await this.confluenceClient.uploadImage(
					pageMeta.pageId || "",
					basename,
					contents,
				);
				return {
					...file,
					attachmentInfo,
				};
			}),
		);
		return atts;
	}

	private async upsertPage(
		html: HTMLElement,
		title: string,
		pageMeta: PageInfo,
		attachments: LocalUploadedFile[],
	): Promise<PageInfo> {
		let resultHtml = downgradeFromHtml5(html.innerHTML);
		attachments.forEach((att) => {
			resultHtml = resultHtml.replace(
				att.unescapedPath,
				att.attachmentInfo?.links.download.replaceAll("&", "&amp;") ||
					"",
			);
		});

		return this.confluenceClient.upsertPage({
			pageId: pageMeta.pageId,
			spaceKey: pageMeta.spaceKey,
			title,
			parentId: pageMeta.parentId,
			htmlContent: resultHtml,
			version: pageMeta.pageId ? pageMeta.version + 1 : 1,
		});
	}
}
