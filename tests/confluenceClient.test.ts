import { ConfluenceClient } from "../src/confluenceApi/client";
import { request } from "obsidian";
import { PageInfo } from "src/model";

describe("ConfluenceClient", () => {
	let mockAuth: any;
	let client: ConfluenceClient;
	let mockRequest: jest.Mock;

	beforeEach(() => {
		mockRequest = jest.fn();
		(request as unknown as jest.Mock) = mockRequest;
		mockAuth = {
			getURL: jest.fn().mockReturnValue("https://example.atlassian.net"),
			getAuth: jest.fn(),
		};
		client = new ConfluenceClient(mockAuth);
	});

	const basePage = {
		title: "Test Page",
		spaceKey: "SPACE",
		parentId: "123",
		htmlContent: "<p>content</p>",
		version: 1,
	};

	describe("upsertPage", () => {
		it("should translate response to PageInfo", async () => {
			const confluenceResponse = {
				id: "test-id",
				status: "current",
				title: "Page title",
				spaceId: "1234",
				parentId: "parent-id",
				parentType: "page",
				position: 57,
				authorId: "<string>",
				ownerId: "<string>",
				lastOwnerId: "<string>",
				createdAt: "<string>",
				version: {
					createdAt: "<string>",
					message: "<string>",
					number: 19,
					minorEdit: true,
					authorId: "<string>",
				},
				body: { storage: {}, atlas_doc_format: {}, view: {} },
				labels: {
					results: [
						{
							id: "<string>",
							name: "<string>",
							prefix: "<string>",
						},
					],
					meta: { hasMore: true, cursor: "<string>" },
					_links: { self: "<string>" },
				},
				properties: {
					results: [{ id: "<string>", key: "<string>", version: {} }],
					meta: { hasMore: true, cursor: "<string>" },
					_links: { self: "<string>" },
				},
				operations: {
					results: [
						{ operation: "<string>", targetType: "<string>" },
					],
					meta: { hasMore: true, cursor: "<string>" },
					_links: { self: "<string>" },
				},
				likes: {
					results: [{ accountId: "<string>" }],
					meta: { hasMore: true, cursor: "<string>" },
					_links: { self: "<string>" },
				},
				versions: {
					results: [
						{
							createdAt: "<string>",
							message: "<string>",
							number: 19,
							minorEdit: true,
							authorId: "<string>",
						},
					],
					meta: { hasMore: true, cursor: "<string>" },
					_links: { self: "<string>" },
				},
				isFavoritedByCurrentUser: true,
				_links: { base: "<string>" },
			};
			mockAuth.getAuth.mockReturnValue({
				type: "BASIC",
				basic: { username: "u", token: "t" },
			});
			mockRequest.mockResolvedValue(JSON.stringify(confluenceResponse));

			const expectedPageInfo: PageInfo = {
				pageId: confluenceResponse.id,
				parentId: confluenceResponse.parentId,
				spaceKey: basePage.spaceKey,
				version: confluenceResponse.version.number,
			};

			await expect(client.upsertPage(basePage)).resolves.toEqual(
				expectedPageInfo,
			);
		});

		it("should POST to /rest/api/content for new page", async () => {
			const confluenceResponse = {
				id: "test-id",
				version: {
					number: 5,
				},
			};
			mockAuth.getAuth.mockReturnValue({
				type: "BASIC",
				basic: { username: "u", token: "t" },
			});
			mockRequest.mockResolvedValue(JSON.stringify(confluenceResponse));
			await client.upsertPage(basePage);

			const call = mockRequest.mock.calls[0][0];
			expect(call.url).toBe(
				"https://example.atlassian.net/rest/api/content",
			);
			expect(call.method).toBe("POST");
			expect(call.headers["Authorization"]).toMatch(/^Basic/);
			const body = JSON.parse(call.body);
			expect(body.title).toBe("Test Page");
			expect(body.space.key).toBe("SPACE");
			expect(body.ancestors[0].id).toBe("123");
			expect(body.body.storage.value).toBe("<p>content</p>");
			expect(body.body.storage.representation).toBe("storage");
			expect(body.version).toBeUndefined();
			expect(body.id).toBeUndefined();
		});

		it("should PUT to /rest/api/content/{pageId} for existing page", async () => {
			const confluenceResponse = {
				id: "test-id",
				version: {
					number: 5,
				},
			};
			mockAuth.getAuth.mockReturnValue({
				type: "BASIC",
				basic: { username: "u", token: "t" },
			});
			mockRequest.mockResolvedValue(JSON.stringify(confluenceResponse));
			const page = { ...basePage, pageId: "456", version: 2 };

			await client.upsertPage(page);

			const call = mockRequest.mock.calls[0][0];
			expect(call.url).toBe(
				"https://example.atlassian.net/rest/api/content/456",
			);
			expect(call.method).toBe("PUT");
			const body = JSON.parse(call.body);
			expect(body.id).toBe("456");
			expect(body.version.number).toBe(2);
		});

		it("should include all required headers", async () => {
			const confluenceResponse = {
				id: "test-id",
				version: {
					number: 5,
				},
			};
			mockAuth.getAuth.mockReturnValue({
				type: "PAT",
				bearer: { token: "tok" },
			});
			mockRequest.mockResolvedValue(JSON.stringify(confluenceResponse));
			await client.upsertPage(basePage);

			const call = mockRequest.mock.calls[0][0];
			expect(call.headers["Content-Type"]).toMatch(/application\/json/);
			expect(call.headers["X-Atlassian-Token"]).toBe("nocheck");
			expect(call.headers["User-Agent"]).toBe("dummy");
			expect(call.headers["Accept"]).toBe("application/json");
			expect(call.headers["Authorization"]).toBe("Bearer tok");
		});

		it("should propagate errors from request", async () => {
			mockAuth.getAuth.mockReturnValue({
				type: "PAT",
				bearer: { token: "tok" },
			});
			mockRequest.mockRejectedValue(new Error("fail"));
			await expect(client.upsertPage(basePage)).rejects.toThrow("fail");
		});
	});

	describe("getAttachments", () => {
		it("should request attachments from confluence", async () => {
			const confluenceResponse = {
				results: [
					{
						id: "att-id",
						title: "fileName-1",
						_links: {
							download: "<string>",
						},
					},
				],
			};
			mockAuth.getAuth.mockReturnValue({
				type: "PAT",
				bearer: { token: "tok" },
			});

			mockRequest.mockResolvedValue(JSON.stringify(confluenceResponse));

			const page = {
				pageId: "test-page-id",
			};

			await expect(client.getAttachments(page)).resolves.toEqual([
				{
					id: "att-id",
					name: "fileName-1",
					links: {
						download: "<string>",
					},
				},
			]);

			const call = mockRequest.mock.calls[0][0];
			expect(call.url).toBe(
				`https://example.atlassian.net/rest/api/content/${page.pageId}/child/attachment?limit=100`,
			);
			expect(call.method).toBe("GET");
			expect(call.headers["Authorization"]).toMatch(/^Bearer/);
		});
	});

	describe("getAuthHeader (indirect via upsertPage)", () => {
		it("should throw if BASIC username is missing", async () => {
			mockAuth.getAuth.mockReturnValue({
				type: "BASIC",
				basic: { token: "t" },
			});
			await expect(client.upsertPage(basePage)).rejects.toThrow(
				/Username/,
			);
		});
		it("should throw if BASIC token is missing", async () => {
			mockAuth.getAuth.mockReturnValue({
				type: "BASIC",
				basic: { username: "u" },
			});
			await expect(client.upsertPage(basePage)).rejects.toThrow(
				/Password/,
			);
		});
		it("should return Basic header if username and token present", async () => {
			mockAuth.getAuth.mockReturnValue({
				type: "BASIC",
				basic: { username: "u", token: "t" },
			});
			mockRequest.mockResolvedValue(
				JSON.stringify({
					id: "test-id",
					version: {
						number: 5,
					},
				}),
			);
			await client.upsertPage(basePage);
			const call = mockRequest.mock.calls[0][0];
			expect(call.headers["Authorization"]).toMatch(/^Basic/);
		});
		it("should return Bearer header for PAT", async () => {
			mockAuth.getAuth.mockReturnValue({
				type: "PAT",
				bearer: { token: "tok" },
			});
			mockRequest.mockResolvedValue(
				JSON.stringify({
					id: "test-id",
					version: {
						number: 5,
					},
				}),
			);
			await client.upsertPage(basePage);
			const call = mockRequest.mock.calls[0][0];
			expect(call.headers["Authorization"]).toBe("Bearer tok");
		});
	});
});
