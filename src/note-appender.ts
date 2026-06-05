import { App, TFile } from "obsidian";
import type { ClaudeAnalysis, CorrectionsResult } from "./claude-service";
import type { NoteReviewSettings } from "./settings";
import { REQUIRED_SECTIONS } from "./note-parser";

export class NoteAppender {
	constructor(private app: App, private settings: NoteReviewSettings) {}

	async appendClaudeNotes(
		file: TFile,
		analysis: ClaudeAnalysis,
		grade: number
	): Promise<void> {
		const section = this.buildClaudeNotesSection(analysis, grade);
		await this.appendToFile(file, section);
	}

	async appendCorrections(
		file: TFile,
		corrections: CorrectionsResult
	): Promise<void> {
		const section = this.buildCorrectionsSection(corrections);
		await this.appendToFile(file, section);
	}

	private buildClaudeNotesSection(
		analysis: ClaudeAnalysis,
		grade: number
	): string {
		const template = this.settings.claudeNoteFormat;
		const filled = template
			.replace("{{summary}}", analysis.summary)
			.replace("{{core_claims}}", analysis.core_claims)
			.replace("{{methodology}}", analysis.methodology)
			.replace("{{counter_arguments}}", analysis.counter_arguments)
			.replace("{{general_notes}}", analysis.general_notes)
			.replace("{{references}}", analysis.references);

		return `\n\n# Claude Notes\n**Grade:** ${grade}/100\n\n${filled}`;
	}

	private buildCorrectionsSection(corrections: CorrectionsResult): string {
		const lines: string[] = ["\n\n# Claude Review\n"];

		for (const section of REQUIRED_SECTIONS) {
			lines.push(`### ${section}`);
			const data = corrections.sections?.[section];
			const additions: string[] = Array.isArray(data?.additions)
				? data.additions
				: [];
			const correctionsList: string[] = Array.isArray(data?.corrections)
				? data.corrections
				: [];

			if (additions.length === 0 && correctionsList.length === 0) {
				lines.push("- *(none)*");
			} else {
				for (const item of additions) {
					lines.push(`- **Missed:** ${item}`);
				}
				for (const item of correctionsList) {
					lines.push(`- **Error:** ${item}`);
				}
			}
			lines.push("");
		}

		return lines.join("\n");
	}

	private async appendToFile(file: TFile, text: string): Promise<void> {
		const current = await this.app.vault.read(file);
		await this.app.vault.modify(file, current + text);
	}
}
