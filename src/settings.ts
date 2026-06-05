import { App, PluginSettingTab, Setting } from "obsidian";
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
	claudeNoteFormat: string;
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
			.setDesc("Note-only uses your notes text. PDF-assisted also reads the source PDF.")
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

		containerEl.createEl("h3", { text: "PDF extraction (v1.1.0)" });

		new Setting(containerEl)
			.setName("PDF extraction script path")
			.setDesc(
				"Absolute path to pdf_to_markdown.py. Required for PDF-assisted mode."
			)
			.addText((text) =>
				text
					.setPlaceholder("/Users/you/Dev/pdf_to_markdown.py")
					.setValue(this.plugin.settings.pdfScriptPath)
					.onChange(async (value) => {
						this.plugin.settings.pdfScriptPath = value.trim();
						await this.plugin.saveSettings();
					})
			);

		const venvToggleSetting = new Setting(containerEl)
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

		const venvPathSetting = new Setting(containerEl)
			.setName("venv path")
			.setDesc(
				"Root of the virtual environment, e.g. /Users/you/Dev/.venv. Claude will use <venv>/bin/python3."
			)
			.addText((text) =>
				text
					.setPlaceholder("/Users/you/Dev/.venv")
					.setValue(this.plugin.settings.venvPath)
					.onChange(async (value) => {
						this.plugin.settings.venvPath = value.trim();
						await this.plugin.saveSettings();
					})
			);
		venvPathSetting.settingEl.style.display = this.plugin.settings.useVenv
			? ""
			: "none";

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

		containerEl.createEl("h3", { text: "Claude Notes format" });

		new Setting(containerEl)
			.setName("Claude-note template")
			.setDesc(
				"Template for the # Claude Notes section. Use placeholders: {{summary}}, {{core_claims}}, {{methodology}}, {{counter_arguments}}, {{general_notes}}, {{references}}."
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
