import { exec } from 'child_process';
import { promises as fs } from 'fs';
import type { NoteReviewSettings } from './settings';

export class PDFExtractor {
	constructor(private settings: NoteReviewSettings) {}

	async extractText(pdfPath: string): Promise<string> {
		if (!this.settings.pdfScriptPath) {
			throw new Error(
				'PDF extraction script path is not configured. Please set it in plugin settings.',
			);
		}

		const python = this.settings.useVenv ? `${this.settings.venvPath}/bin/python3` : 'python3';

		const ocrFlag = this.settings.useOcr ? '' : '--no-ocr';
		const cmd = `"${python}" "${this.settings.pdfScriptPath}" "${pdfPath}" ${ocrFlag}`.trim();

		const stdout = await this.runCommand(cmd);
		const outputPath = this.parseOutputPath(stdout);

		const raw = await fs.readFile(outputPath, 'utf8');
		await fs.unlink(outputPath);

		return this.stripImageLinks(raw);
	}

	private runCommand(cmd: string): Promise<string> {
		return new Promise((resolve, reject) => {
			exec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
				if (err) {
					reject(new Error(`PDF extraction failed: ${err.message}${stderr ? `\n${stderr}` : ''}`));
					return;
				}
				resolve(stdout);
			});
		});
	}

	private parseOutputPath(stdout: string): string {
		const match = stdout.match(/Markdown saved\s*[→>]\s*(.+)/);
		if (!match) {
			throw new Error(
				"Could not find output path in pdf_to_markdown.py stdout. Expected: 'Markdown saved → <path>'",
			);
		}
		return match[1].trim();
	}

	private stripImageLinks(text: string): string {
		return text.replace(/!\[.*?\]\(.*?\)/g, '').trim();
	}
}
