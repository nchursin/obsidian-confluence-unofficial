import { App, Component, MarkdownRenderer, MarkdownView } from "obsidian";

export const convertMdToHtmlEl = async (
	app: App,
	md: string,
	view: MarkdownView,
) => {
	const component = new Component();
	component.load();
	const renderDiv = view.contentEl.createEl("div", {});
	await MarkdownRenderer.render(app, md, renderDiv, "nop", component);

	return renderDiv;
};

export const convertMdToHtml = async (
	app: App,
	md: string,
	view: MarkdownView,
) => {
	const component = new Component();
	component.load();
	const renderDiv = view.contentEl.createEl("div", {});
	await MarkdownRenderer.render(app, md, renderDiv, "nop", component);

	return downgradeFromHtml5(renderDiv.innerHTML);
};

export const downgradeFromHtml5 = (html: string) =>
	html
		.replace(/<img([^>]*)>/g, function (match, attributes) {
			// Check if it's already properly closed
			if (match.trim().endsWith("/>")) {
				return match;
			}
			// Otherwise close it properly
			return `<img${attributes} />`;
		})
		.replace(/<br>/g, function (match, attributes) {
			return `<br/>`;
		});
