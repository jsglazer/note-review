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

export class OpenAIService {
	constructor(private settings: NoteReviewSettings) {}

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
		const isCompatible = this.settings.llmProvider === 'openai-compatible';
		const baseUrl = isCompatible
			? this.settings.openaiCompatibleBaseUrl.replace(/\/+$/, '')
			: 'https://api.openai.com/v1';
		const apiKey = isCompatible ? this.settings.openaiCompatibleApiKey : this.settings.openaiApiKey;
		const model = isCompatible ? this.settings.openaiCompatibleModel : this.settings.openaiModel;

		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model,
				messages: [{ role: 'user', content: prompt }],
				max_tokens: 2048,
			}),
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`OpenAI API error ${response.status}: ${err}`);
		}

		const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
		return data.choices[0]?.message?.content ?? '';
	}
}
