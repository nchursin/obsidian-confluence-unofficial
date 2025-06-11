// @jest-environment node
import { publishFile } from '../src/commands/publishFile';
import { Notice } from 'obsidian';

jest.mock('obsidian', () => ({
  Notice: jest.fn(),
}));
jest.mock('../src/utils/htmlProcessor', () => ({
  convertMdToHtml: jest.fn().mockResolvedValue('<p>html</p>'),
}));
jest.mock('../src/confluenceApi', () => ({
  ConfluenceClient: jest.fn(),
}));
jest.mock('../src/components/errorModal', () => ({
  ErrorModal: jest.fn().mockImplementation(() => ({
    open: jest.fn(),
  })),
}));

describe('publishFile', () => {
  let plugin: any;
  let confluenceClient: any;
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
        spaceKey: 'DEF',
        parentId: '123',
      },
    };
    confluenceClient = {
      upsertPage: jest.fn().mockResolvedValue(
        JSON.stringify({
          id: 'page-1',
          space: { key: 'DEF' },
          version: { number: 2 },
        })
      ),
    };
    editor = {};
    view = {
      file: { path: 'file.md' },
      getDisplayText: jest.fn().mockReturnValue('Title'),
      getViewData: jest.fn().mockReturnValue('markdown content'),
    };
    plugin.mockFrontmatter = {
      confluence_page_id: 'page-1',
      confluence_space: 'DEF',
      confluence_page_version: 1,
    };
    (Notice as jest.Mock).mockClear();
  });

  it('should publish file and update frontmatter on success', async () => {
    const cmd = publishFile(plugin, confluenceClient);
    await cmd.editorCallback!(editor, view);

    expect(plugin.app.fileManager.processFrontMatter).toHaveBeenCalledTimes(2);
    expect(confluenceClient.upsertPage).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: 'page-1',
        spaceKey: 'DEF',
        title: 'Title',
        parentId: '123',
        htmlContent: '<p>html</p>',
        version: 2,
      })
    );
    expect(Notice).toHaveBeenCalledWith('The file is successfully published!');
  });

  it('should use defaults if frontmatter fields are missing', async () => {
    plugin.mockFrontmatter = {};
    const cmd = publishFile(plugin, confluenceClient);
    await cmd.editorCallback!(editor, view);

    expect(confluenceClient.upsertPage).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: undefined,
        spaceKey: 'DEF',
        version: 1,
      })
    );
  });

  it('should do nothing if view.file is falsy', async () => {
    view.file = null;
    const cmd = publishFile(plugin, confluenceClient);
    await cmd.editorCallback!(editor, view);

    expect(confluenceClient.upsertPage).not.toHaveBeenCalled();
    expect(Notice).not.toHaveBeenCalled();
  });

  it('should show error modal if upsertPage throws', async () => {
    confluenceClient.upsertPage.mockRejectedValue(new Error('API error'));
    const { ErrorModal } = require('../src/components/errorModal');
    const cmd = publishFile(plugin, confluenceClient);
    await cmd.editorCallback!(editor, view);

    expect(ErrorModal).toHaveBeenCalled();
    expect(Notice).not.toHaveBeenCalled();
  });

  it('should show error modal if upsertPage returns malformed JSON', async () => {
    confluenceClient.upsertPage.mockResolvedValue('not json');
    const { ErrorModal } = require('../src/components/errorModal');
    const cmd = publishFile(plugin, confluenceClient);
    await cmd.editorCallback!(editor, view);

    expect(ErrorModal).toHaveBeenCalled();
    expect(Notice).not.toHaveBeenCalled();
  });

  it('should update frontmatter with new Confluence data after publish', async () => {
    const cmd = publishFile(plugin, confluenceClient);
    await cmd.editorCallback!(editor, view);

    // Get the callback from the second call
    const secondCall = plugin.app.fileManager.processFrontMatter.mock.calls[1];
    const [, updateCallback] = secondCall;

    const newFrontmatter: any = {};
    updateCallback(newFrontmatter);

    expect(newFrontmatter.confluence_page_id).toBe('page-1');
    expect(newFrontmatter.confluence_space).toBe('DEF');
    expect(newFrontmatter.confluence_page_version).toBe(2);
  });
}); 