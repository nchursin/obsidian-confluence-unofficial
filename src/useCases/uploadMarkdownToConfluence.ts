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

		if (!destination.pageId) {
			return this.uploadNewPage(view, destination);
		}
		return this.updatePage(view, destination);
	}

	private async updatePage(
		view: MarkdownView,
		destination: PageInfo,
	): Promise<PageInfo> {
		const renderDiv = await convertMdToHtmlElement(view);

		const existingAttachments = await this.confluenceClient.getAttachments({
			pageId: destination.pageId || "",
		});

		const linkWrappers = renderDiv.getElementsByClassName(
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
					destination.pageId || "",
					basename,
					contents,
				);
				return {
					...file,
					attachmentInfo,
				};
			}),
		);

		let resultHtml = downgradeFromHtml5(renderDiv.innerHTML);
		atts.forEach((att) => {
			resultHtml = resultHtml.replace(
				att.unescapedPath,
				att.attachmentInfo?.links.download.replaceAll("&", "&amp;") ||
					"",
			);
		});

		const response2: PageInfo = await this.confluenceClient.upsertPage({
			pageId: destination.pageId,
			spaceKey: destination.spaceKey,
			title: view.getDisplayText(),
			parentId: destination.parentId,
			htmlContent: resultHtml,
			version: destination.version ? destination.version + 1 : 1,
		});

		destination.version = response2.version;
		return destination;
	}

	private async uploadNewPage(
		view: MarkdownView,
		destination: PageInfo,
	): Promise<PageInfo> {
		const renderDiv = await convertMdToHtmlElement(view);

		const response: PageInfo = await this.confluenceClient.upsertPage({
			pageId: destination.pageId,
			spaceKey: destination.spaceKey,
			title: view.getDisplayText(),
			parentId: destination.parentId,
			htmlContent: downgradeFromHtml5(renderDiv.innerHTML),
			version: 1,
		});

		destination.pageId = response.pageId;
		destination.version = response.version;

		const existingAttachments = await this.confluenceClient.getAttachments({
			pageId: destination.pageId || "",
		});
		const attachmentNames = existingAttachments.map((att) => att.name);

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

		const imagesSrcPlain = images
			.map((filePath) =>
				filePath?.replace(/app:\/\/\w+/, "").replace(/\?.+/, ""),
			)
			.map((filePath: string) => decodeURI(filePath || ""));

		const atts = await Promise.all(
			imagesSrcPlain
				.filter((src) => !attachmentNames.includes(path.basename(src)))
				.map(async (src: string) => {
					const contents = await readFile(src);
					const basename = path.basename(src);
					return this.confluenceClient.uploadImage(
						destination.pageId || "",
						basename,
						contents,
					);
				}),
		);

		if (!atts.length) {
			return destination;
		}

		atts.push(
			...existingAttachments.map((att) => {
				att.links.download = att.links.download.replaceAll(
					"&amp;",
					"&",
				);
				return att;
			}),
		);

		let resultHtml = downgradeFromHtml5(renderDiv.innerHTML);
		atts.forEach((att, index) => {
			resultHtml = resultHtml.replace(
				images[index],
				att.links.download.replaceAll("&", "&amp;"),
			);
		});

		const response2: PageInfo = await this.confluenceClient.upsertPage({
			pageId: destination.pageId,
			spaceKey: destination.spaceKey,
			title: view.getDisplayText(),
			parentId: destination.parentId,
			htmlContent: resultHtml,
			version: destination.version ? destination.version + 1 : 1,
		});

		destination.version = response2.version;
		return destination;
	}
}
