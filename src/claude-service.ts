import Anthropic from '@anthropic-ai/sdk';
import type { NoteReviewSettings } from './settings';
import type { ParsedNote } from './note-parser';
import type { GradeResult, LLMAnalysis, CorrectionsResult } from './llm-service';
import {
	buildGradingPrompt,
	buildAnalysisPrompt,
	buildCorrectionsPrompt,
	parseGradeResult,
	parseAnalysis,
	parseCorrections,
} from './llm-prompts';

export class ClaudeService {
	private client: Anthropic;

	constructor(private settings: NoteReviewSettings) {
		this.client = new Anthropic({
			apiKey: settings.anthropicApiKey,
			dangerouslyAllowBrowser: true,
		});
	}

	async gradeNote(note: ParsedNote, pdfText?: string): Promise<GradeResult> {
		const raw = await this.call(buildGradingPrompt(note, pdfText));
		return parseGradeResult(raw);
	}

	async generateNotes(note: ParsedNote, pdfText?: string): Promise<LLMAnalysis> {
		const raw = await this.call(buildAnalysisPrompt(note, pdfText));
		return parseAnalysis(raw, note.sectionNames);
	}

	async generateCorrections(note: ParsedNote, pdfText?: string): Promise<CorrectionsResult> {
		const raw = await this.call(buildCorrectionsPrompt(note, pdfText));
		return parseCorrections(raw);
	}

	private async call(prompt: string): Promise<string> {
		const message = await this.client.messages.create({
			model: this.settings.claudeModel,
			max_tokens: 2048,
			messages: [{ role: 'user', content: prompt }],
		});
		const block = message.content[0];
		if (block.type !== 'text') {
			throw new Error('Unexpected response type from Claude.');
		}
		return block.text;
	}
}
