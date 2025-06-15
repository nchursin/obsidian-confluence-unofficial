// @jest-environment node
import { UploadMarkDownToConfluenceUseCase } from "src/useCases";
import { PageInfo } from "src/model";
import { ConfluencePage } from "src/confluenceApi";
import { Window, HTMLDivElement, Document } from "happy-dom";
import { downgradeFromHtml5 } from "src/utils/htmlProcessor";
import { basename } from "path";
import { Attachment } from "src/confluenceApi/model";

jest.mock("src/confluenceApi", () => ({
	ConfluenceClient: jest.fn(),
}));

jest.mock("fs/promises", () => ({
	readFile: jest.fn().mockResolvedValue(Buffer.from("fake image content")),
}));

const baseUrl = "https://example.com";
const urlParams = "param1=true&param2=false";

describe("UploadMarkDownToConfluenceUseCase", () => {
	let confluenceClient: any;
	let view: any;
	let renderDiv: HTMLDivElement;
	let doc: Document;
	let destination: PageInfo;
	let sut: UploadMarkDownToConfluenceUseCase;

	beforeEach(() => {
		confluenceClient = {
			upsertPage: jest.fn(
				(page: ConfluencePage): PageInfo => ({
					pageId: page.pageId || "page-1",
					spaceKey: page.spaceKey,
					parentId: page.parentId,
					version: page.version,
				}),
			),
			uploadImage: jest.fn(
				(
					_: string,
					fileName: string,
					__: ArrayBuffer | Uint8Array,
				): Attachment => {
					return {
						id: `att_id_${fileName}`,
						name: fileName,
						links: {
							download: `${baseUrl}/${fileName}?${urlParams}`,
							webui: `${baseUrl}/${fileName}?${urlParams}`,
							thumbnail: `${baseUrl}/${fileName}?${urlParams}`,
							self: `${baseUrl}/${fileName}?${urlParams}`,
						},
					};
				},
			),
			getAttachments: jest.fn().mockResolvedValue([]),
		};

		const window = new Window();
		doc = window.document;

		renderDiv = doc.createElement("div");

		view = {
			file: { path: "file.md" },
			getDisplayText: jest.fn().mockReturnValue("Title"),
			getViewData: jest.fn().mockReturnValue("markdown content"),
			contentEl: {
				createEl: jest.fn().mockReturnValue(renderDiv),
			},
		};
		sut = new UploadMarkDownToConfluenceUseCase(confluenceClient);
		destination = {
			pageId: "test-page",
			parentId: "test-parent",
			spaceKey: "TEST",
			version: 5,
		};
	});

	const simpleRenderDiv = (renderDiv: HTMLDivElement) => {
		renderDiv.innerHTML = "<p>html</p>";
		return renderDiv;
	};

	const divWithImages = (renderDiv: HTMLDivElement, imageUrls: string[]) => {
		imageUrls.forEach((src) => {
			const span = doc.createElement("span");
			span.classList.add("internal-embed", "media-embed", "image-embed");
			const img = doc.createElement("img");
			img.setAttribute("src", src);
			span.appendChild(img);
			renderDiv.appendChild(span);
		});
		return renderDiv;
	};

	it("should publish file without attachments", async () => {
		renderDiv = simpleRenderDiv(renderDiv);

		const result = await sut.uploadMarkdown(view, { ...destination });

		expect(confluenceClient.upsertPage).toHaveBeenCalledWith(
			expect.objectContaining({
				pageId: destination.pageId,
				spaceKey: destination.spaceKey,
				title: "Title",
				parentId: destination.parentId,
				htmlContent: downgradeFromHtml5(renderDiv.innerHTML),
				version: 6,
			}),
		);

		expect(result).toEqual({
			...destination,
			version: 6,
		});
	});

	it("should publish file and attachments", async () => {
		const existingAttachment = "existingAttachment";
		const newAttachments = ["imageUrl1", "imageUrl2", "imageUrl3"];
		const attachments = [...newAttachments, existingAttachment];
		renderDiv = divWithImages(renderDiv, attachments);

		confluenceClient.getAttachments.mockResolvedValue([
			{
				id: "attachment",
				name: existingAttachment,
				links: {
					download: `${baseUrl}/${basename(existingAttachment)}?${urlParams.replaceAll("&", "&amp;")}`,
				},
			},
		]);

		let htmlAfterAttachments = renderDiv.innerHTML;
		attachments.forEach((att) => {
			htmlAfterAttachments = htmlAfterAttachments.replaceAll(
				att,
				`${baseUrl}/${basename(att)}?${urlParams.replaceAll("&", "&amp;")}`,
			);
		});

		const result = await sut.uploadMarkdown(view, { ...destination });

		expect(confluenceClient.upsertPage).toHaveBeenCalledTimes(1);
		expect(confluenceClient.upsertPage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				pageId: destination.pageId,
				spaceKey: destination.spaceKey,
				title: "Title",
				parentId: destination.parentId,
				htmlContent: downgradeFromHtml5(htmlAfterAttachments),
				version: 6,
			}),
		);

		expect(confluenceClient.uploadImage).toHaveBeenCalledTimes(
			newAttachments.length,
		);
		newAttachments.forEach((att) =>
			expect(confluenceClient.uploadImage).toHaveBeenCalledWith(
				destination.pageId,
				basename(att),
				Buffer.from("fake image content"),
			),
		);

		expect(result).toEqual({
			...destination,
			version: 6,
		});
	});

	it("should replace URLs correctly for both existing and new attachments", async () => {
		const existingAttachment = "existingAttachment";
		const newAttachments = ["imageUrl1"];
		const attachments = [existingAttachment, ...newAttachments];
		renderDiv = divWithImages(renderDiv, attachments);

		confluenceClient.getAttachments.mockResolvedValue([
			{
				id: "attachment",
				name: existingAttachment,
				links: {
					download: `${baseUrl}/${basename(existingAttachment)}?${urlParams.replaceAll("&", "&amp;")}`,
				},
			},
		]);

		let htmlAfterAttachments = renderDiv.innerHTML;
		attachments.forEach((att) => {
			htmlAfterAttachments = htmlAfterAttachments.replaceAll(
				att,
				`${baseUrl}/${basename(att)}?${urlParams.replaceAll("&", "&amp;")}`,
			);
		});

		const result = await sut.uploadMarkdown(view, { ...destination });

		expect(confluenceClient.uploadImage).toHaveBeenCalledTimes(
			newAttachments.length,
		);
		newAttachments.forEach((att) =>
			expect(confluenceClient.uploadImage).toHaveBeenCalledWith(
				destination.pageId,
				basename(att),
				Buffer.from("fake image content"),
			),
		);

		expect(confluenceClient.upsertPage).toHaveBeenCalledTimes(1);
		expect(confluenceClient.upsertPage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				pageId: destination.pageId,
				spaceKey: destination.spaceKey,
				title: "Title",
				parentId: destination.parentId,
				htmlContent: downgradeFromHtml5(htmlAfterAttachments),
				version: 6,
			}),
		);

		expect(result).toEqual({
			...destination,
			version: 6,
		});
	});

	it("should NOT re-upload attachments if they are there already", async () => {
		const attahcment = "imageUrl1";
		const attachments = [attahcment];
		confluenceClient.getAttachments.mockResolvedValue([
			{
				id: "attachment",
				name: attahcment,
				links: {
					download: `${baseUrl}/${basename(attahcment)}?${urlParams.replaceAll("&", "&amp;")}`,
				},
			},
		]);
		renderDiv = divWithImages(renderDiv, attachments);

		const result = await sut.uploadMarkdown(view, { ...destination });

		let htmlAfterAttachments = renderDiv.innerHTML;
		attachments.forEach((att) => {
			htmlAfterAttachments = htmlAfterAttachments.replaceAll(
				att,
				`${baseUrl}/${basename(att)}?${urlParams.replaceAll("&", "&amp;")}`,
			);
		});

		expect(confluenceClient.upsertPage).toHaveBeenCalledTimes(1);
		expect(confluenceClient.upsertPage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				pageId: destination.pageId,
				spaceKey: destination.spaceKey,
				title: "Title",
				parentId: destination.parentId,
				htmlContent: downgradeFromHtml5(htmlAfterAttachments),
				version: 6,
			}),
		);

		expect(confluenceClient.uploadImage).not.toHaveBeenCalled();

		expect(result).toEqual({
			...destination,
			version: 6,
		});
	});

	it("does not touch non local images", async () => {
		const img = doc.createElement("img");
		// non local images do NOT have the parent element with classes
		// "internal-embed media-embed image-embed"
		img.setAttribute("src", "imageUrl");
		renderDiv.appendChild(img);

		const result = await sut.uploadMarkdown(view, { ...destination });

		expect(confluenceClient.upsertPage).toHaveBeenCalledTimes(1);
		expect(confluenceClient.upsertPage).toHaveBeenCalledWith(
			expect.objectContaining({
				pageId: destination.pageId,
				spaceKey: destination.spaceKey,
				title: "Title",
				parentId: destination.parentId,
				htmlContent: downgradeFromHtml5(renderDiv.innerHTML),
				version: 6,
			}),
		);
		expect(result).toEqual({
			...destination,
			version: 6,
		});
	});

	it("if pageId is not passed, returns the one ConfluenceClient responded with", async () => {
		const result = await sut.uploadMarkdown(view, {
			...destination,
			pageId: undefined,
		});

		expect(confluenceClient.upsertPage).toHaveBeenCalledTimes(1);
		expect(confluenceClient.upsertPage).toHaveBeenCalledWith(
			expect.objectContaining({
				pageId: undefined,
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({
				pageId: "page-1",
			}),
		);
	});

	it("if pageId is not passed, version must be 1", async () => {
		const result = await sut.uploadMarkdown(view, {
			...destination,
			pageId: undefined,
		});

		expect(confluenceClient.upsertPage).toHaveBeenCalledTimes(1);
		expect(confluenceClient.upsertPage).toHaveBeenCalledWith(
			expect.objectContaining({
				version: 1,
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({
				version: 1,
			}),
		);
	});

	it("should use new pageId for uploads if non is passed", async () => {
		const attachments = ["imageUrl1"];
		renderDiv = divWithImages(renderDiv, attachments);

		const result = await sut.uploadMarkdown(view, {
			...destination,
			pageId: undefined,
		});

		expect(confluenceClient.upsertPage).toHaveBeenCalledWith(
			expect.objectContaining({
				pageId: undefined,
				spaceKey: destination.spaceKey,
				title: "Title",
				parentId: destination.parentId,
				htmlContent: downgradeFromHtml5(renderDiv.innerHTML),
				version: 1,
			}),
		);

		let htmlAfterAttachments = renderDiv.innerHTML;
		attachments.forEach((att) => {
			htmlAfterAttachments = htmlAfterAttachments.replaceAll(
				att,
				`${baseUrl}/${basename(att)}?${urlParams.replaceAll("&", "&amp;")}`,
			);
		});

		expect(confluenceClient.upsertPage).toHaveBeenCalledWith(
			expect.objectContaining({
				pageId: "page-1",
				spaceKey: destination.spaceKey,
				title: "Title",
				parentId: destination.parentId,
				htmlContent: downgradeFromHtml5(htmlAfterAttachments),
				version: 2,
			}),
		);

		expect(confluenceClient.uploadImage).toHaveBeenCalledTimes(
			attachments.length,
		);
		attachments.forEach((att) =>
			expect(confluenceClient.uploadImage).toHaveBeenCalledWith(
				"page-1",
				basename(att),
				Buffer.from("fake image content"),
			),
		);

		expect(result).toEqual({
			...destination,
			pageId: "page-1",
			version: 2,
		});
	});

	it("replaces obsidian 'app' urls", async () => {
		const appPrefix = "app://111123456abc654332";
		const imageUrl = "imageUrl";
		const attachments = [imageUrl];
		renderDiv = divWithImages(
			renderDiv,
			attachments.map((attUrl) => `${appPrefix}/${attUrl}`),
		);

		const result = await sut.uploadMarkdown(view, {
			...destination,
		});

		let htmlAfterAttachments = renderDiv.innerHTML;
		attachments.forEach((att) => {
			htmlAfterAttachments = htmlAfterAttachments.replaceAll(
				`${appPrefix}/${att}`,
				`${baseUrl}/${basename(att)}?${urlParams.replaceAll("&", "&amp;")}`,
			);
		});

		expect(confluenceClient.upsertPage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				pageId: destination.pageId,
				spaceKey: destination.spaceKey,
				title: "Title",
				parentId: destination.parentId,
				htmlContent: downgradeFromHtml5(htmlAfterAttachments),
				version: 6,
			}),
		);
		expect(result).toEqual({
			...destination,
			version: 6,
		});
	});
});
