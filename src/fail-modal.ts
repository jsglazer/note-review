import { App, Modal } from "obsidian";
import type { GradeResult } from "./llm-service";
import type { ZoteroService } from "./zotero-service";

export class FailModal extends Modal {
	constructor(
		app: App,
		private result: GradeResult,
		private zoteroItemKey: string,
		private zoteroService: ZoteroService
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.addClass("note-review-modal");

		const scoreEl = contentEl.createEl("div", { cls: "note-review-score fail" });
		scoreEl.createEl("span", {
			text: `Score: ${this.result.grade}/100`,
			cls: "note-review-score-number",
		});

		contentEl.createEl("h2", {
			text: "Do better!",
			cls: "note-review-fail-heading",
		});

		contentEl.createEl("p", {
			text: this.result.feedback,
			cls: "note-review-feedback",
		});

		const subEl = contentEl.createEl("div", { cls: "note-review-subscores" });
		subEl.createEl("span", {
			text: `Main idea: ${this.result.scores.main_idea}/25  |  Major points: ${this.result.scores.major_points}/25  |  Accuracy: ${this.result.scores.accuracy}/25  |  Depth: ${this.result.scores.depth}/25`,
			cls: "note-review-subscores-text",
		});

		const btnRow = contentEl.createEl("div", { cls: "note-review-btn-row" });
		const okBtn = btnRow.createEl("button", {
			text: "OK — open in Zotero",
			cls: "mod-cta",
		});
		okBtn.addEventListener("click", async () => {
			this.close();
			await this.zoteroService.openInZotero(this.zoteroItemKey);
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
