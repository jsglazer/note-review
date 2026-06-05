import { App, TFile } from "obsidian";
import type { LLMAnalysis, CorrectionsResult } from "./llm-service";
import type { NoteReviewSettings } from "./settings";
import { parseSections } from "./settings";

export class NoteAppender {
	constructor(private app: App, private settings: NoteReviewSettings) {}

	async appendClaudeNotes(
		file: TFile,
		analysis: LLMAnalysis,
		grade: number
	): Promise<void> {
		const section = this.buildClaudeNotesSection(analysis, grade);
		await this.appendToFile(file, section);
	}

	async appendCorrections(
		file: TFile,
		corrections: CorrectionsResult,
		sectionNames: string[]
	): Promise<void> {
		const section = this.buildCorrectionsSection(corrections, sectionNames);
		await this.appendToFile(file, section);
	}

	private buildClaudeNotesSection(
		analysis: LLMAnalysis,
		grade: number
	): string {
		const sectionNames = parseSections(this.settings);
		let body = `### Summary\n${analysis.summary}\n\n`;
		for (const name of sectionNames) {
			body += `### ${name}\n${analysis.sections[name] ?? ""}\n\n`;
		}
		return `\n\n# Claude Notes\n**Grade:** ${grade}/100\n\n${body.trim()}`;
	}

	private buildCorrectionsSection(
		corrections: CorrectionsResult,
		sectionNames: string[]
	): string {
		const lines: string[] = ["\n\n# Claude Review\n"];

		for (const section of sectionNames) {
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
