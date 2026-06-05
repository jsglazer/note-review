import type { ParsedNote } from "./note-parser";
import type { NoteReviewSettings } from "./settings";
import { ClaudeService } from "./claude-service";
import { OpenAIService } from "./openai-service";
import { GeminiService } from "./gemini-service";

export interface GradeResult {
	grade: number;
	feedback: string;
	scores: {
		main_idea: number;
		major_points: number;
		accuracy: number;
		depth: number;
	};
}

export interface LLMAnalysis {
	summary: string;
	sections: Record<string, string>;
}

export interface CorrectionsResult {
	sections: {
		[sectionName: string]: {
			additions: string[];
			corrections: string[];
		};
	};
}

export interface LLMService {
	gradeNote(note: ParsedNote, pdfText?: string): Promise<GradeResult>;
	generateNotes(note: ParsedNote, pdfText?: string): Promise<LLMAnalysis>;
	generateCorrections(note: ParsedNote, pdfText?: string): Promise<CorrectionsResult>;
}

export function createLLMService(settings: NoteReviewSettings): LLMService {
	switch (settings.llmProvider) {
		case "openai":
		case "openai-compatible":
			return new OpenAIService(settings);
		case "gemini":
			return new GeminiService(settings);
		default:
			return new ClaudeService(settings);
	}
}

export function validateProviderConfig(settings: NoteReviewSettings): string | null {
	switch (settings.llmProvider) {
		case "anthropic":
			if (!settings.anthropicApiKey) return "Anthropic API key is not configured. Please add it in plugin settings.";
			break;
		case "openai":
			if (!settings.openaiApiKey) return "OpenAI API key is not configured. Please add it in plugin settings.";
			break;
		case "openai-compatible":
			if (!settings.openaiCompatibleBaseUrl) return "OpenAI-compatible base URL is not configured. Please add it in plugin settings.";
			if (!settings.openaiCompatibleModel) return "OpenAI-compatible model name is not configured. Please add it in plugin settings.";
			break;
		case "gemini":
			if (!settings.geminiApiKey) return "Gemini API key is not configured. Please add it in plugin settings.";
			break;
	}
	return null;
}

export function providerLabel(settings: NoteReviewSettings): string {
	switch (settings.llmProvider) {
		case "openai": return "OpenAI";
		case "openai-compatible": return "local LLM";
		case "gemini": return "Gemini";
		default: return "Claude";
	}
}
