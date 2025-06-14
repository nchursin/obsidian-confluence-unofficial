// @jest-environment node
import { publishFile } from "../src/commands/publishFile";
import { Notice } from "obsidian";

jest.mock("obsidian", () => ({
	Notice: jest.fn(),
}));
jest.mock("../src/utils/htmlProcessor", () => ({
	convertMdToHtml: jest.fn().mockResolvedValue("<p>html</p>"),
}));
jest.mock("../src/confluenceApi", () => ({
	ConfluenceClient: jest.fn(),
}));
jest.mock("../src/components/errorModal", () => ({
	ErrorModal: jest.fn().mockImplementation(() => ({
		open: jest.fn(),
	})),
}));

describe("publishFile", () => {
	let plugin: any;
	let publishUseCase: any;
	let editor: any;
	let view: any;

	beforeEach(() => {
		plugin = {
			app: {
				fileManager: {
					processFrontMatter: jest.fn((file, cb) => {
						cb(plugin.mockFrontmatter);
					}),
				},
			},
			settings: {
				spaceKey: "DEFAULT_SPACE",
				parentId: "123",
			},
		};
		publishUseCase = {
			uploadMarkdown: jest.fn().mockResolvedValue({
				pageId: "page-1",
				spaceKey: "DEF",
				parentId: "123",
				version: 2,
			}),
		};
		editor = {};
		view = {
			file: { path: "file.md" },
			getDisplayText: jest.fn().mockReturnValue("Title"),
			getViewData: jest.fn().mockReturnValue("markdown content"),
		};
		plugin.mockFrontmatter = {
			confluence_page_id: "page-1",
			confluence_space: "DEF",
			confluence_page_version: 1,
		};
		(Notice as jest.Mock).mockClear();
	});

	it("should publish file and update frontmatter on success", async () => {
		const cmd = publishFile(plugin, publishUseCase);
		await cmd.editorCallback!(editor, view);

		expect(Notice).toHaveBeenCalledWith(
			"The file is successfully published!",
		);
		expect(plugin.app.fileManager.processFrontMatter).toHaveBeenCalledTimes(
			2,
		);
		expect(publishUseCase.uploadMarkdown).toHaveBeenCalledWith(
			view,
			expect.objectContaining({
				pageId: "page-1",
				spaceKey: "DEF",
				parentId: "123",
				version: 1,
			}),
		);
		expect(Notice).toHaveBeenCalledWith(
			"The file is successfully published!",
		);
	});

	it("should use defaults if frontmatter fields are missing", async () => {
		plugin.mockFrontmatter = {};
		const cmd = publishFile(plugin, publishUseCase);
		await cmd.editorCallback!(editor, view);

		expect(publishUseCase.uploadMarkdown).toHaveBeenCalledWith(
			view,
			expect.objectContaining({
				pageId: undefined,
				parentId: "123",
				spaceKey: plugin.settings.spaceKey,
				version: undefined,
			}),
		);
	});

	it("should do nothing if view.file is falsy", async () => {
		view.file = null;
		const cmd = publishFile(plugin, publishUseCase);
		await cmd.editorCallback!(editor, view);

		expect(publishUseCase.uploadMarkdown).not.toHaveBeenCalled();
		expect(Notice).not.toHaveBeenCalled();
	});

	it("should show error modal if uploadMarkdown throws", async () => {
		publishUseCase.uploadMarkdown.mockRejectedValue(new Error("API error"));
		const { ErrorModal } = require("../src/components/errorModal");
		const cmd = publishFile(plugin, publishUseCase);
		await cmd.editorCallback!(editor, view);

		expect(Notice).toHaveBeenCalledWith("Uploading page to Confluence...");
		expect(ErrorModal).toHaveBeenCalled();
		expect(Notice).not.toHaveBeenCalledWith(
			"The file is successfully published!",
		);
	});

	it("should update frontmatter with new Confluence data after publish", async () => {
		const cmd = publishFile(plugin, publishUseCase);
		await cmd.editorCallback!(editor, view);

		// Get the callback from the second call
		const secondCall =
			plugin.app.fileManager.processFrontMatter.mock.calls[1];
		const [, updateCallback] = secondCall;

		const newFrontmatter: any = {};
		updateCallback(newFrontmatter);

		expect(newFrontmatter.confluence_page_id).toBe("page-1");
		expect(newFrontmatter.confluence_space).toBe("DEF");
		expect(newFrontmatter.confluence_page_version).toBe(2);
	});
});
