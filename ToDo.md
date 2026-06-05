# note-review — To-Do

## Scaffolding
- [ ] `package.json` — npm init with Obsidian + Anthropic SDK deps
- [ ] `tsconfig.json` — TypeScript config
- [ ] `esbuild.config.mjs` — build script
- [ ] `manifest.json` — Obsidian plugin manifest (id, name, version 1.0.0)
- [ ] `.gitignore` — node_modules, dist, main.js

## Settings (`src/settings.ts`)
- [ ] Define `NoteReviewSettings` interface (all 10 fields)
- [ ] Implement `NoteReviewSettingTab` with:
  - [ ] Anthropic API key (password field)
  - [ ] Claude model dropdown
  - [ ] Grade threshold slider (0–100, default 75)
  - [ ] Grading mode dropdown (Note-only / PDF-assisted)
  - [ ] PDF extraction script path
  - [ ] Use venv toggle
  - [ ] venv path field (disabled when Use venv is off)
  - [ ] Use OCR toggle (default on)
  - [ ] Zotero key field (default `$itemKey`)
  - [ ] Claude-note format textarea

## Claude Service (`src/claude-service.ts`)
- [ ] `gradeNote(noteText, pdfText?)` → `{ grade, feedback, scores }`
- [ ] `generateClaudeNotes(noteText, pdfText?)` → structured analysis (Summary + all sections)
- [ ] `generateCorrections(noteText, pdfText?)` → per-section missed points and errors
- [ ] Grading prompt with 4×25-pt criteria (main idea, major points, accuracy, depth)
- [ ] JSON response parsing + validation
- [ ] Error handling (API key missing, network failure, bad JSON)

## Note Parser (`src/note-parser.ts`)
- [ ] Parse active note frontmatter (`$itemKey`, `$libraryID`)
- [ ] Detect and extract required sections: Core Claims, Methodology, Counter Arguments, General Notes, References
- [ ] Return error if any section is missing (with section name in message)

## Zotero Service (`src/zotero-service.ts`)
- [ ] `openInZotero(itemKey)` — fires `zotero://select/library/items/<key>`
- [ ] `getPDFPath(itemKey, libraryID)` — BBT JSON-RPC `item.attachments` → returns local PDF file path
- [ ] Connection check (BBT running at `http://127.0.0.1:23119/better-bibtex/cayw?probe=true`)

## PDF Extractor (`src/pdf-extractor.ts`)
- [ ] `extractText(pdfPath, settings)` — spawns `python3` (or venv python) with script path + pdf path
- [ ] Parse stdout for `Markdown saved → <path>` line
- [ ] Read output `.md` file, strip image markdown links
- [ ] Delete temp `.md` file
- [ ] Pass `--no-ocr` flag when OCR toggle is off

## Modals
### Grade Modal (`src/grade-modal.ts`)
- [ ] Display total grade (large)
- [ ] Display per-criterion sub-scores (main idea, major points, accuracy, depth)
- [ ] Display Claude feedback text
- [ ] Four buttons: Stop / Retry / Claude-note / Claude-note+corrections
- [ ] Retry → call `openInZotero()`
- [ ] Claude-note → call `generateClaudeNotes()` → `noteAppender.appendClaudeNotes()`
- [ ] Claude-note+corrections → call `generateCorrections()` → `noteAppender.appendCorrections()`

### Fail Modal (`src/fail-modal.ts`)
- [ ] Display total score (e.g. "Score: 62/100")
- [ ] Display "Do better!" heading
- [ ] Display Claude feedback text
- [ ] OK button → call `openInZotero()`

## Note Appender (`src/note-appender.ts`)
- [ ] `appendClaudeNotes(file, analysis)` — appends `# Claude Notes` section (Summary + all sections)
- [ ] `appendCorrections(file, corrections)` — appends `# Claude Review` section (per-section missed/errors)
- [ ] Format: `**Missed:**` / `**Error:**` prefixes; `*(none)*` when clean

## Main Entry Point (`src/main.ts`)
- [ ] Register ribbon icon
- [ ] Register command: "Review note with Claude"
- [ ] On trigger: validate settings → parse note → (fetch PDF if mode=PDF-assisted) → call Claude → show modal
- [ ] Loading notice while Claude is working

## Deploy
- [ ] `cp main.js / manifest.json / styles.css` → `VaultDEV/.obsidian/plugins/note-review/`
- [ ] Test end-to-end with a real Zotero-synced note

## v1.1.0 (future)
- [ ] PDF-assisted mode full integration
- [ ] OCR toggle wired through to subprocess call

## v1.2.0 (future)
- [ ] External analysis mode (user pastes pre-computed summary)
