import Anthropic from "@anthropic-ai/sdk";
import type { NoteReviewSettings } from "./settings";
import type { ParsedNote } from "./note-parser";

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

export interface ClaudeAnalysis {
	summary: string;
	core_claims: string;
	methodology: string;
	counter_arguments: string;
	general_notes: string;
	references: string;
}

export interface CorrectionsResult {
	sections: {
		[sectionName: string]: {
			additions: string[];
			corrections: string[];
		};
	};
}

export class ClaudeService {
	private client: Anthropic;

	constructor(private settings: NoteReviewSettings) {
		this.client = new Anthropic({ apiKey: settings.anthropicApiKey });
	}

	async gradeNote(note: ParsedNote, pdfText?: string): Promise<GradeResult> {
		const prompt = this.buildGradingPrompt(note, pdfText);
		const raw = await this.callClaude(prompt);
		return this.parseGradeResult(raw);
	}

	async generateClaudeNotes(
		note: ParsedNote,
		pdfText?: string
	): Promise<ClaudeAnalysis> {
		const prompt = this.buildAnalysisPrompt(note, pdfText);
		const raw = await this.callClaude(prompt);
		return this.parseAnalysis(raw);
	}

	async generateCorrections(
		note: ParsedNote,
		pdfText?: string
	): Promise<CorrectionsResult> {
		const prompt = this.buildCorrectionsPrompt(note, pdfText);
		const raw = await this.callClaude(prompt);
		return this.parseCorrections(raw);
	}

	private async callClaude(prompt: string): Promise<string> {
		if (!this.settings.anthropicApiKey) {
			throw new Error(
				"Anthropic API key is not configured. Please add it in plugin settings."
			);
		}
		const message = await this.client.messages.create({
			model: this.settings.claudeModel,
			max_tokens: 2048,
			messages: [{ role: "user", content: prompt }],
		});
		const block = message.content[0];
		if (block.type !== "text") {
			throw new Error("Unexpected response type from Claude.");
		}
		return block.text;
	}

	private buildGradingPrompt(note: ParsedNote, pdfText?: string): string {
		const sections = note.sections;
		const studentNotes = [
			`Core Claims:\n${sections["Core Claims"]}`,
			`Methodology:\n${sections["Methodology"]}`,
			`Counter Arguments:\n${sections["Counter Arguments"]}`,
			`General Notes:\n${sections["General Notes"]}`,
			`References:\n${sections["References"]}`,
		].join("\n\n");

		let prompt = `You are grading a researcher's analysis of an academic source.\n\n`;
		prompt += `[STUDENT NOTES]\n${studentNotes}\n\n`;

		if (pdfText) {
			prompt += `[PAPER TEXT]\n${pdfText}\n\n`;
		}

		prompt += `Grade this analysis 0–100 using these criteria:
  1. Main idea correctly identified      (0–25)
  2. Major points captured               (0–25)
  3. Accuracy (no significant errors)    (0–25)
  4. Depth and critical insight          (0–25)

Respond ONLY with valid JSON (no markdown fences, no other text):
{
  "grade": <integer 0-100>,
  "feedback": "<2-3 sentence summary of what the researcher did well and what they missed>",
  "scores": {
    "main_idea": <0-25>,
    "major_points": <0-25>,
    "accuracy": <0-25>,
    "depth": <0-25>
  }
}`;
		return prompt;
	}

	private buildAnalysisPrompt(note: ParsedNote, pdfText?: string): string {
		const sections = note.sections;
		const studentNotes = [
			`Core Claims:\n${sections["Core Claims"]}`,
			`Methodology:\n${sections["Methodology"]}`,
			`Counter Arguments:\n${sections["Counter Arguments"]}`,
			`General Notes:\n${sections["General Notes"]}`,
			`References:\n${sections["References"]}`,
		].join("\n\n");

		let prompt = `You are an expert academic analyst. Read the following research notes and${pdfText ? " the paper text" : ""} and write a thorough analysis.\n\n`;
		prompt += `[STUDENT NOTES]\n${studentNotes}\n\n`;
		if (pdfText) {
			prompt += `[PAPER TEXT]\n${pdfText}\n\n`;
		}

		prompt += `Write a comprehensive analysis of this academic source. Respond ONLY with valid JSON (no markdown fences, no other text):
{
  "summary": "<2-4 sentence overview of the source>",
  "core_claims": "<the paper's central arguments and claims>",
  "methodology": "<research methods, design, sample, analysis approach>",
  "counter_arguments": "<limitations, opposing views, critiques in or about the paper>",
  "general_notes": "<notable insights, connections, implications>",
  "references": "<key works cited by this paper that are worth tracking>"
}`;
		return prompt;
	}

	private buildCorrectionsPrompt(note: ParsedNote, pdfText?: string): string {
		const sections = note.sections;
		const studentNotes = [
			`Core Claims:\n${sections["Core Claims"]}`,
			`Methodology:\n${sections["Methodology"]}`,
			`Counter Arguments:\n${sections["Counter Arguments"]}`,
			`General Notes:\n${sections["General Notes"]}`,
			`References:\n${sections["References"]}`,
		].join("\n\n");

		let prompt = `You are reviewing a researcher's notes for completeness and accuracy.\n\n`;
		prompt += `[STUDENT NOTES]\n${studentNotes}\n\n`;
		if (pdfText) {
			prompt += `[PAPER TEXT]\n${pdfText}\n\n`;
		}

		prompt += `For each section, identify what the researcher missed and any errors. Use empty arrays when nothing is missing or wrong. Respond ONLY with valid JSON (no markdown fences, no other text):
{
  "sections": {
    "Core Claims": {
      "additions": ["<item missed — lead with 'Missing: '>"],
      "corrections": ["<error — lead with 'Error: '>"]
    },
    "Methodology": {
      "additions": [],
      "corrections": []
    },
    "Counter Arguments": {
      "additions": [],
      "corrections": []
    },
    "General Notes": {
      "additions": [],
      "corrections": []
    },
    "References": {
      "additions": [],
      "corrections": []
    }
  }
}`;
		return prompt;
	}

	private parseGradeResult(raw: string): GradeResult {
		const json = extractJson(raw);
		const data = JSON.parse(json);

		if (
			typeof data.grade !== "number" ||
			typeof data.feedback !== "string" ||
			typeof data.scores !== "object"
		) {
			throw new Error("Claude returned an unexpected grading format.");
		}

		return {
			grade: Math.min(100, Math.max(0, Math.round(data.grade))),
			feedback: data.feedback,
			scores: {
				main_idea: clampScore(data.scores.main_idea),
				major_points: clampScore(data.scores.major_points),
				accuracy: clampScore(data.scores.accuracy),
				depth: clampScore(data.scores.depth),
			},
		};
	}

	private parseAnalysis(raw: string): ClaudeAnalysis {
		const json = extractJson(raw);
		const data = JSON.parse(json);
		return {
			summary: String(data.summary ?? ""),
			core_claims: String(data.core_claims ?? ""),
			methodology: String(data.methodology ?? ""),
			counter_arguments: String(data.counter_arguments ?? ""),
			general_notes: String(data.general_notes ?? ""),
			references: String(data.references ?? ""),
		};
	}

	private parseCorrections(raw: string): CorrectionsResult {
		const json = extractJson(raw);
		const data = JSON.parse(json);
		return data as CorrectionsResult;
	}
}

function extractJson(raw: string): string {
	const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenceMatch) return fenceMatch[1].trim();
	const braceStart = raw.indexOf("{");
	const braceEnd = raw.lastIndexOf("}");
	if (braceStart !== -1 && braceEnd !== -1) {
		return raw.slice(braceStart, braceEnd + 1);
	}
	throw new Error("Could not extract JSON from Claude response.");
}

function clampScore(v: unknown): number {
	const n = typeof v === "number" ? v : 0;
	return Math.min(25, Math.max(0, Math.round(n)));
}
