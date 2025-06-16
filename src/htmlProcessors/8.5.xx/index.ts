import he from "he";
import { HtmlProcessor } from "src/htmlProcessors/interfaces/htmlProcessor";
import { LocalUploadedFile } from "src/model";
import { downgradeFromHtml5 } from "src/utils/htmlProcessor";

// prepares html for Confluence v8.5.22
export class HtmlProcessorImpl implements HtmlProcessor {
	prepareHtml(html: HTMLElement, attachments: LocalUploadedFile[]): string {
		let resultHtml = html.innerHTML;

		attachments.forEach((att) => {
			if (!att.attachmentInfo) {
				return;
			}

			let html = att.imgElement.outerHTML;
			html = html.replace(
				att.unescapedPath,
				he.encode(att.attachmentInfo.links.download, {
					useNamedReferences: true,
				}) || "",
			);
			html = `<a href="${he.encode(att.attachmentInfo.links.webui, {
				useNamedReferences: true,
			})}">${html}</a>`;

			resultHtml = resultHtml.replace(att.imgElement.outerHTML, html);
		});

		return downgradeFromHtml5(resultHtml);
	}
}
