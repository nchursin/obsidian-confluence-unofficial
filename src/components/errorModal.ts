import { App, Modal } from "obsidian";

export class ErrorModal extends Modal {
	constructor(
		app: App,
		private readonly err: Error,
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(`ERROR: ${this.err}`);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
