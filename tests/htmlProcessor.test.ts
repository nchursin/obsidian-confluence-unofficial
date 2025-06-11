import { downgradeFromHtml5, convertMdToHtml } from '../src/utils/htmlProcessor';

describe('downgradeFromHtml5', () => {
  it('converts <img> to <img />', () => {
    expect(downgradeFromHtml5('<img src="foo.png">')).toBe('<img src="foo.png" />');
  });

  it('leaves <img ... /> unchanged', () => {
    expect(downgradeFromHtml5('<img src="foo.png" />')).toBe('<img src="foo.png" />');
  });

  it('handles multiple <img> tags', () => {
    expect(downgradeFromHtml5('<img src="a"><img src="b">')).toBe('<img src="a" /><img src="b" />');
  });

  it('converts <br> to <br/>', () => {
    expect(downgradeFromHtml5('foo<br>bar')).toBe('foo<br/>bar');
  });

  it('leaves <br/> unchanged', () => {
    expect(downgradeFromHtml5('foo<br/>bar')).toBe('foo<br/>bar');
  });

  it('handles multiple <br> tags', () => {
    expect(downgradeFromHtml5('a<br>b<br>c')).toBe('a<br/>b<br/>c');
  });

  it('handles mixed <img> and <br>', () => {
    expect(downgradeFromHtml5('<img src="foo.png"><br>')).toBe('<img src="foo.png" /><br/>');
  });

  it('returns unchanged if no <img> or <br>', () => {
    expect(downgradeFromHtml5('<p>hello</p>')).toBe('<p>hello</p>');
  });

  it('handles empty string', () => {
    expect(downgradeFromHtml5('')).toBe('');
  });

  it('handles malformed tags', () => {
    expect(downgradeFromHtml5('<img><br')).toBe('<img /><br');
  });
});

describe('convertMdToHtml', () => {
  let app: any;
  let view: any;
  let renderDiv: any;
  let componentInstance: any;
  let markdownRendererRender: jest.SpyInstance;

  beforeEach(() => {
    renderDiv = { innerHTML: '' };
    view = {
      contentEl: {
        createEl: jest.fn().mockReturnValue(renderDiv),
      },
    };
    componentInstance = { load: jest.fn() };
    jest.spyOn(require('obsidian'), 'Component').mockImplementation(() => componentInstance);
    markdownRendererRender = jest.spyOn(require('obsidian').MarkdownRenderer, 'render').mockImplementation(async (_app, _md, el, _path, _component) => {
      // Do not set el.innerHTML here; let each test set it as needed
    });
    app = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('converts markdown to HTML', async () => {
    renderDiv.innerHTML = '<p>html</p>';
    const html = await convertMdToHtml(app, '# Title', view);
    expect(html).toContain('<p>html</p>');
  });

  it('calls Component.load()', async () => {
    await convertMdToHtml(app, 'test', view);
    expect(componentInstance.load).toHaveBeenCalled();
  });

  it('creates a div in view.contentEl', async () => {
    await convertMdToHtml(app, 'test', view);
    expect(view.contentEl.createEl).toHaveBeenCalledWith('div', {});
  });

  it('calls MarkdownRenderer.render with correct args', async () => {
    await convertMdToHtml(app, 'test', view);
    expect(markdownRendererRender).toHaveBeenCalledWith(app, 'test', renderDiv, 'nop', componentInstance);
  });

  it('passes output through downgradeFromHtml5', async () => {
    renderDiv.innerHTML = '<img src="foo.png"><br>';
    const html = await convertMdToHtml(app, 'irrelevant', view);
    expect(html).toBe('<img src="foo.png" /><br/>');
  });

  it('handles empty markdown string', async () => {
    renderDiv.innerHTML = '';
    const html = await convertMdToHtml(app, '', view);
    expect(html).toBe('');
  });

  it('handles markdown that produces <img> and <br>', async () => {
    renderDiv.innerHTML = '<img src="foo.png"><br>'; // simulate renderer output
    const html = await convertMdToHtml(app, '![img](foo.png)\nline<br>', view);
    expect(html).toBe('<img src="foo.png" /><br/>');
  });

  it('propagates errors from MarkdownRenderer.render', async () => {
    markdownRendererRender.mockImplementationOnce(() => { throw new Error('fail'); });
    await expect(convertMdToHtml(app, 'bad', view)).rejects.toThrow('fail');
  });
}); 