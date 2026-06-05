import { App, TFile } from "obsidian";

export interface ParsedNote {
	itemKey: string;       // BBT citation key — used for BBT RPC calls
	zoteroItemKey: string; // Raw Zotero item key — used for zotero:// URLs
	libraryId: string;
	sections: Record<string, string>;
	sectionNames: string[];
	fullBody: string;
	raw: string;
}

export class NoteParser {
	constructor(private app: App) {}

	async parseActiveNote(
		zoteroKeyField: string,
		sectionNames: string[]
	): Promise<ParsedNote> {
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			throw new Error("No active note is open.");
		}
		return this.parseFile(file, zoteroKeyField, sectionNames);
	}

	async parseFile(
		file: TFile,
		zoteroKeyField: string,
		sectionNames: string[]
	): Promise<ParsedNote> {
		const raw = await this.app.vault.read(file);
		const frontmatter =
			this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};

		const itemKey = String(frontmatter[zoteroKeyField] ?? "").trim();
		if (!itemKey) {
			throw new Error(
				`Frontmatter field "${zoteroKeyField}" is missing or empty. Is this note synced from Zotero?`
			);
		}
		const zoteroItemKey = String(frontmatter["itemKey"] ?? frontmatter["$itemKey"] ?? "").trim();
		const libraryId = String(frontmatter["libraryID"] ?? frontmatter["$libraryID"] ?? "").trim();

		const body = this.stripFrontmatter(raw);
		const sections = this.extractSections(body, sectionNames);

		return { itemKey, zoteroItemKey, libraryId, sections, sectionNames, fullBody: body, raw };
	}

	private stripFrontmatter(raw: string): string {
		if (!raw.startsWith("---")) return raw;
		const end = raw.indexOf("\n---", 3);
		if (end === -1) return raw;
		return raw.slice(end + 4).trim();
	}

	private extractSections(
		body: string,
		sectionNames: string[]
	): Record<string, string> {
		const result: Record<string, string> = {};

		for (const section of sectionNames) {
			const pattern = new RegExp(
				`(?:^|\\n)#+\\s*${escapeRegex(section)}\\s*\\n([\\s\\S]*?)(?=\\n#+\\s|$)`,
				"i"
			);
			const match = body.match(pattern);
			if (match === null) {
				throw new Error(
					`Note is missing required section: ${section}. Please ensure all sections are present before review.`
				);
			}
			result[section] = match[1].trim();
		}

		return result;
	}
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
