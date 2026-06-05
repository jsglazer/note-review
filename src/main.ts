import { Notice, Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	NoteReviewSettingTab,
	parseSections,
	type NoteReviewSettings,
} from "./settings";
import { NoteParser } from "./note-parser";
import { ClaudeService } from "./claude-service";
import { ZoteroService } from "./zotero-service";
import { PDFExtractor } from "./pdf-extractor";
import { GradeModal } from "./grade-modal";
import { FailModal } from "./fail-modal";
import { NoteAppender } from "./note-appender";

export default class NoteReviewPlugin extends Plugin {
	settings: NoteReviewSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon("book-open-check", "Review note with Claude", () => {
			this.runReview();
		});

		this.addCommand({
			id: "review-note",
			name: "Review note with Claude",
			callback: () => this.runReview(),
		});

		this.addSettingTab(new NoteReviewSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async runReview(): Promise<void> {
		if (!this.settings.anthropicApiKey) {
			new Notice(
				"Note Review: Anthropic API key is not configured. Please add it in plugin settings.",
				8000
			);
			return;
		}

		const notice = new Notice("Note Review: Grading your notes…", 0);

		try {
			const parser = new NoteParser(this.app);
			const note = await parser.parseActiveNote(
				this.settings.zoteroKeyField,
				parseSections(this.settings)
			);

			let pdfText: string | undefined;
			if (this.settings.gradingMode === "pdf-assisted") {
				try {
					notice.setMessage("Note Review: Fetching PDF from Zotero…");
					const zoteroSvc = new ZoteroService();
					const pdfPath = await zoteroSvc.getPDFPath(
						note.itemKey,
						note.libraryId
					);
					notice.setMessage("Note Review: Extracting PDF text…");
					const extractor = new PDFExtractor(this.settings);
					pdfText = await extractor.extractText(pdfPath);
				} catch (e) {
					notice.hide();
					new Notice(
						`Note Review: PDF extraction failed — falling back to note-only mode.\n${(e as Error).message}`,
						8000
					);
				}
			}

			notice.setMessage("Note Review: Asking Claude to grade your notes…");
			const claudeSvc = new ClaudeService(this.settings);
			const result = await claudeSvc.gradeNote(note, pdfText);

			notice.hide();

			const zoteroSvc = new ZoteroService();
			const noteAppender = new NoteAppender(this.app, this.settings);

			if (result.grade >= this.settings.gradeThreshold) {
				new GradeModal(
					this.app,
					result,
					note,
					pdfText,
					claudeSvc,
					zoteroSvc,
					noteAppender
				).open();
			} else {
				new FailModal(this.app, result, note.itemKey, zoteroSvc).open();
			}
		} catch (e) {
			notice.hide();
			new Notice(`Note Review: ${(e as Error).message}`, 10000);
		}
	}
}
