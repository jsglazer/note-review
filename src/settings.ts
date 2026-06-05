import { App, PluginSettingTab, Setting } from "obsidian";
import { access } from "fs/promises";
import { join } from "path";
import type NoteReviewPlugin from "./main";

export type GradingMode = "note-only" | "pdf-assisted";

export interface NoteReviewSettings {
	anthropicApiKey: string;
	claudeModel: string;
	gradeThreshold: number;
	gradingMode: GradingMode;
	pdfScriptPath: string;
	useVenv: boolean;
	venvPath: string;
	useOcr: boolean;
	zoteroKeyField: string;
	noteSections: string;
	claudeNoteFormat: string;
}

export function parseSections(settings: NoteReviewSettings): string[] {
	return settings.noteSections
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export const DEFAULT_SETTINGS: NoteReviewSettings = {
	anthropicApiKey: "",
	claudeModel: "claude-sonnet-4-6",
	gradeThreshold: 75,
	gradingMode: "note-only",
	pdfScriptPath: "",
	useVenv: false,
	venvPath: "",
	useOcr: true,
	zoteroKeyField: "$itemKey",
	noteSections: "Core Claims, Methodology, Counter Arguments, General Notes, References",
	claudeNoteFormat: `### Summary
{{summary}}

### Core Claims
{{core_claims}}

### Methodology
{{methodology}}

### Counter Arguments
{{counter_arguments}}

### General Notes
{{general_notes}}

### References
{{references}}`,
};

async function pathExists(p: string): Promise<boolean> {
	if (!p.trim()) return false;
	try {
		await access(p.trim());
		return true;
	} catch {
		return false;
	}
}

function setIndicator(
	dot: HTMLElement,
	state: "unchecked" | "valid" | "invalid",
	tooltip: string
): void {
	dot.removeClass("note-review-dot-unchecked", "note-review-dot-valid", "note-review-dot-invalid");
	dot.addClass(`note-review-dot-${state}`);
	dot.setAttribute("title", tooltip);
}

function addDot(controlEl: HTMLElement): HTMLElement {
	return controlEl.createEl("span", {
		cls: "note-review-path-dot note-review-dot-unchecked",
		attr: { title: "Waiting for input…" },
	});
}

function debounce<T extends unknown[]>(
	fn: (...args: T) => void,
	ms: number
): (...args: T) => void {
	let timer: ReturnType<typeof setTimeout>;
	return (...args: T) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}

export class NoteReviewSettingTab extends PluginSettingTab {
	plugin: NoteReviewPlugin;

	constructor(app: App, plugin: NoteReviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Note Review Settings" });

		// ── API & model ───────────────────────────────────────────────────

		new Setting(containerEl)
			.setName("Anthropic API key")
			.setDesc("Your Anthropic API key for Claude.")
			.addText((text) =>
				text
					.setPlaceholder("sk-ant-...")
					.setValue(this.plugin.settings.anthropicApiKey)
					.onChange(async (value) => {
						this.plugin.settings.anthropicApiKey = value.trim();
						await this.plugin.saveSettings();
					})
					.inputEl.setAttribute("type", "password")
			);

		new Setting(containerEl)
			.setName("Claude model")
			.setDesc("Which Claude model to use for grading and analysis.")
			.addDropdown((drop) =>
				drop
					.addOption("claude-sonnet-4-6", "Claude Sonnet 4.6")
					.addOption("claude-opus-4-8", "Claude Opus 4.8")
					.addOption("claude-haiku-4-5-20251001", "Claude Haiku 4.5")
					.setValue(this.plugin.settings.claudeModel)
					.onChange(async (value) => {
						this.plugin.settings.claudeModel = value;
						await this.plugin.saveSettings();
					})
			);

		// ── Grading ───────────────────────────────────────────────────────

		new Setting(containerEl)
			.setName("Grade threshold")
			.setDesc(
				`Minimum score to pass (currently: ${this.plugin.settings.gradeThreshold}).`
			)
			.addSlider((slider) =>
				slider
					.setLimits(0, 100, 1)
					.setValue(this.plugin.settings.gradeThreshold)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.gradeThreshold = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Grading mode")
			.setDesc(
				"Note-only uses your notes text only. PDF-assisted also reads the source PDF."
			)
			.addDropdown((drop) =>
				drop
					.addOption("note-only", "Note-only")
					.addOption("pdf-assisted", "PDF-assisted")
					.setValue(this.plugin.settings.gradingMode)
					.onChange(async (value) => {
						this.plugin.settings.gradingMode = value as GradingMode;
						await this.plugin.saveSettings();
					})
			);

		// ── PDF extraction ────────────────────────────────────────────────

		containerEl.createEl("h3", { text: "PDF extraction (v1.1.0)" });

		// Script path with live validator dot
		let scriptDot: HTMLElement;
		const scriptSetting = new Setting(containerEl)
			.setName("PDF extraction script path")
			.setDesc(
				"Absolute path to pdf_to_markdown.py. Required for PDF-assisted mode."
			)
			.addText((text) => {
				const checkScript = debounce(async (val: string) => {
					const exists = await pathExists(val);
					setIndicator(
						scriptDot,
						val ? (exists ? "valid" : "invalid") : "unchecked",
						val
							? exists
								? "Script found ✓"
								: "File not found ✗"
							: "No path entered"
					);
				}, 500);

				text
					.setPlaceholder("/Users/you/Dev/pdf_to_markdown.py")
					.setValue(this.plugin.settings.pdfScriptPath)
					.onChange(async (value) => {
						this.plugin.settings.pdfScriptPath = value.trim();
						await this.plugin.saveSettings();
						checkScript(value.trim());
					});
			});

		scriptDot = addDot(scriptSetting.controlEl);
		// Validate on open
		if (this.plugin.settings.pdfScriptPath) {
			pathExists(this.plugin.settings.pdfScriptPath).then((exists) =>
				setIndicator(
					scriptDot,
					exists ? "valid" : "invalid",
					exists ? "Script found ✓" : "File not found ✗"
				)
			);
		}

		// venv toggle
		const venvToggle = new Setting(containerEl)
			.setName("Use Python virtual environment")
			.setDesc("Use a venv's Python instead of the system python3.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useVenv)
					.onChange(async (value) => {
						this.plugin.settings.useVenv = value;
						await this.plugin.saveSettings();
						venvPathSetting.settingEl.style.display = value ? "" : "none";
					})
			);
		void venvToggle; // referenced only for side-effects

		// venv path with live validator dot
		let venvDot: HTMLElement;
		const venvPathSetting = new Setting(containerEl)
			.setName("venv path")
			.setDesc(
				"Root of the virtual environment, e.g. /Users/you/Dev/.venv. Checks that <venv>/bin/python3 exists."
			)
			.addText((text) => {
				const checkVenv = debounce(async (val: string) => {
					const python = val ? join(val, "bin", "python3") : "";
					const exists = await pathExists(python);
					setIndicator(
						venvDot,
						val ? (exists ? "valid" : "invalid") : "unchecked",
						val
							? exists
								? `${python} found ✓`
								: `${python} not found ✗`
							: "No path entered"
					);
				}, 500);

				text
					.setPlaceholder("/Users/you/Dev/.venv")
					.setValue(this.plugin.settings.venvPath)
					.onChange(async (value) => {
						this.plugin.settings.venvPath = value.trim();
						await this.plugin.saveSettings();
						checkVenv(value.trim());
					});
			});

		venvDot = addDot(venvPathSetting.controlEl);
		venvPathSetting.settingEl.style.display = this.plugin.settings.useVenv
			? ""
			: "none";
		// Validate on open
		if (this.plugin.settings.useVenv && this.plugin.settings.venvPath) {
			const python = join(this.plugin.settings.venvPath, "bin", "python3");
			pathExists(python).then((exists) =>
				setIndicator(
					venvDot,
					exists ? "valid" : "invalid",
					exists ? `${python} found ✓` : `${python} not found ✗`
				)
			);
		}

		new Setting(containerEl)
			.setName("Use OCR")
			.setDesc(
				"Run Tesseract OCR before text extraction (needed for scanned PDFs; slower)."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useOcr)
					.onChange(async (value) => {
						this.plugin.settings.useOcr = value;
						await this.plugin.saveSettings();
					})
			);

		// ── Zotero ────────────────────────────────────────────────────────

		containerEl.createEl("h3", { text: "Zotero" });

		new Setting(containerEl)
			.setName("Zotero item key field")
			.setDesc(
				"Frontmatter field holding the Zotero item key (written by better-notes as $itemKey)."
			)
			.addText((text) =>
				text
					.setPlaceholder("$itemKey")
					.setValue(this.plugin.settings.zoteroKeyField)
					.onChange(async (value) => {
						this.plugin.settings.zoteroKeyField = value.trim();
						await this.plugin.saveSettings();
					})
			);

		// ── Note sections ─────────────────────────────────────────────────

		containerEl.createEl("h3", { text: "Note sections" });

		new Setting(containerEl)
			.setName("Note sections")
			.setDesc(
				"Comma-separated list of section headings the plugin expects in your notes. Edit this to match your own note format."
			)
			.addTextArea((area) =>
				area
					.setValue(this.plugin.settings.noteSections)
					.onChange(async (value) => {
						this.plugin.settings.noteSections = value;
						await this.plugin.saveSettings();
					})
					.then((a) => {
						a.inputEl.rows = 3;
						a.inputEl.style.width = "100%";
					})
			);

		// ── Claude Notes format ───────────────────────────────────────────

		containerEl.createEl("h3", { text: "Claude Notes format" });

		new Setting(containerEl)
			.setName("Claude-note template")
			.setDesc(
				"Template for the # Claude Notes section. Placeholders are generated from your section names (e.g. Core Claims → {{core_claims}})."
			)
			.addTextArea((area) =>
				area
					.setValue(this.plugin.settings.claudeNoteFormat)
					.onChange(async (value) => {
						this.plugin.settings.claudeNoteFormat = value;
						await this.plugin.saveSettings();
					})
					.then((a) => {
						a.inputEl.rows = 12;
						a.inputEl.style.width = "100%";
						a.inputEl.style.fontFamily = "monospace";
					})
			);
	}
}
