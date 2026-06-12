import { App, Modal, Notice } from 'obsidian';
import type { GradeResult, LLMService } from './llm-service';
import type { ParsedNote } from './note-parser';
import type { ZoteroService } from './zotero-service';
import type { NoteAppender } from './note-appender';
import { TFile } from 'obsidian';

export class GradeModal extends Modal {
	constructor(
		app: App,
		private result: GradeResult,
		private note: ParsedNote,
		private pdfText: string | undefined,
		private claudeService: LLMService,
		private zoteroService: ZoteroService,
		private noteAppender: NoteAppender,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('note-review-modal');

		const scoreEl = contentEl.createEl('div', { cls: 'note-review-score pass' });
		scoreEl.createEl('span', {
			text: `${this.result.grade}/100`,
			cls: 'note-review-score-number',
		});

		const subEl = contentEl.createEl('div', { cls: 'note-review-subscores' });
		subEl.createEl('span', {
			text: `Main idea: ${this.result.scores.main_idea}/25  |  Major points: ${this.result.scores.major_points}/25  |  Accuracy: ${this.result.scores.accuracy}/25  |  Depth: ${this.result.scores.depth}/25`,
			cls: 'note-review-subscores-text',
		});

		contentEl.createEl('p', {
			text: this.result.feedback,
			cls: 'note-review-feedback',
		});

		const btnRow = contentEl.createEl('div', { cls: 'note-review-btn-row' });

		const stopBtn = btnRow.createEl('button', { text: 'Stop' });
		stopBtn.addEventListener('click', () => this.close());

		const retryBtn = btnRow.createEl('button', { text: 'Retry — open in Zotero' });
		retryBtn.addEventListener('click', async () => {
			this.close();
			await this.zoteroService.openInZotero(this.note.zoteroItemKey || this.note.itemKey);
		});

		const notesBtn = btnRow.createEl('button', {
			text: 'AI Notes',
			cls: 'mod-cta',
		});
		notesBtn.addEventListener('click', async () => {
			notesBtn.disabled = true;
			notesBtn.textContent = 'Writing…';
			try {
				await this.appendClaudeNotes();
				new Notice('AI Notes appended.');
				this.close();
			} catch (e) {
				new Notice(`Error: ${(e as Error).message}`);
				notesBtn.disabled = false;
				notesBtn.textContent = 'AI Notes';
			}
		});

		const reviewBtn = btnRow.createEl('button', {
			text: 'AI Review',
			cls: 'mod-cta',
		});
		reviewBtn.addEventListener('click', async () => {
			reviewBtn.disabled = true;
			reviewBtn.textContent = 'Writing…';
			try {
				await this.appendClaudeReview();
				new Notice('AI Review appended.');
				this.close();
			} catch (e) {
				new Notice(`Error: ${(e as Error).message}`);
				reviewBtn.disabled = false;
				reviewBtn.textContent = 'AI Review';
			}
		});
	}

	private async appendClaudeNotes(): Promise<void> {
		const analysis = await this.claudeService.generateNotes(this.note, this.pdfText);
		const file = this.app.workspace.getActiveFile();
		if (!file || !(file instanceof TFile)) {
			throw new Error('Active file is no longer available.');
		}
		await this.noteAppender.appendClaudeNotes(file, analysis, this.result.grade);
	}

	private async appendClaudeReview(): Promise<void> {
		const corrections = await this.claudeService.generateCorrections(this.note, this.pdfText);
		const file = this.app.workspace.getActiveFile();
		if (!file || !(file instanceof TFile)) {
			throw new Error('Active file is no longer available.');
		}
		await this.noteAppender.appendCorrections(file, corrections, this.note.sectionNames);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
