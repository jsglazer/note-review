import { Notice, Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	NoteReviewSettingTab,
	parseSections,
	type NoteReviewSettings,
} from "./settings";
import { NoteParser } from "./note-parser";
import { createLLMService, validateProviderConfig, providerLabel } from "./llm-service";
import { ZoteroService } from "./zotero-service";
import { PDFExtractor } from "./pdf-extractor";
import { probePDF, extractDigitalPDFText } from "./pdf-detector";
import { GradeModal } from "./grade-modal";
import { FailModal } from "./fail-modal";
import { NoteAppender } from "./note-appender";

export default class NoteReviewPlugin extends Plugin {
	settings: NoteReviewSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon("book-open-check", "Review note", () => {
			this.runReview();
		});

		this.addCommand({
			id: "review-note",
			name: "Review note",
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
		const configError = validateProviderConfig(this.settings);
		if (configError) {
			new Notice(`Note Review: ${configError}`, 8000);
			return;
		}

		const label = providerLabel(this.settings);
		const notice = new Notice(`Note Review: Grading your notes…`, 0);

		try {
			const parser = new NoteParser(this.app);
			const note = await parser.parseActiveNote(
				this.settings.zoteroKeyField,
				parseSections(this.settings)
			);

			let pdfText: string | undefined;

			if (this.settings.gradingMode === "pdf-assisted") {
				try {
					notice.setMessage("Note Review: Fetching PDF path from Zotero…");
					const zoteroSvc = new ZoteroService();
					const pdfPath = await zoteroSvc.getPDFPath(
						note.itemKey,
						note.libraryId
					);

					notice.setMessage("Note Review: Probing PDF for OCR requirement…");
					const probe = await probePDF(pdfPath);

					if (probe.readability === "digital") {
						notice.setMessage(
							"Note Review: Extracting text from digital PDF…"
						);
						pdfText = await extractDigitalPDFText(pdfPath);
					} else {
						if (!this.settings.pdfScriptPath) {
							throw new Error(
								"PDF appears to be scanned (OCR required) but no extraction script is configured. " +
								"Please set the PDF extraction script path in plugin settings."
							);
						}
						notice.setMessage(
							"Note Review: PDF is scanned — running OCR extraction…"
						);
						const extractor = new PDFExtractor(this.settings);
						pdfText = await extractor.extractText(pdfPath);
					}
				} catch (e) {
					notice.hide();
					new Notice(
						`Note Review: PDF extraction failed — falling back to note-only mode.\n${(e as Error).message}`,
						8000
					);
				}
			}

			notice.setMessage(`Note Review: Asking ${label} to grade your notes…`);
			const llmSvc = createLLMService(this.settings);
			const result = await llmSvc.gradeNote(note, pdfText);

			notice.hide();

			const zoteroSvc = new ZoteroService();
			const noteAppender = new NoteAppender(this.app, this.settings);

			if (result.grade >= this.settings.gradeThreshold) {
				new GradeModal(
					this.app,
					result,
					note,
					pdfText,
					llmSvc,
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
