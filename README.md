# note-review

An Obsidian plugin that grades your Zotero research notes using Claude and helps you improve your academic analysis.

## Workflow

1. Open a Zotero-synced note in Obsidian
2. Trigger **Review note with Claude** (ribbon icon or command palette)
3. Claude grades your note on four criteria (0–100):
   - Main idea correctly identified
   - Major points captured
   - Accuracy (no significant errors)
   - Depth and critical insight
4. **If score ≥ threshold** — a modal shows your grade with four options:
   - **Stop** — close, nothing written
   - **Retry** — open the source item in Zotero to keep working
   - **Claude Notes** — append Claude's own full analysis of the paper (`# Claude Notes`): Summary, Core Claims, Methodology, Counter Arguments, General Notes, References
   - **Claude Review** — *in addition to* Claude Notes (or on its own), appends a separate `# Claude Review` section listing what you missed or got wrong per section; your original text is never modified
   - Both buttons are independent — you can click either, or both in sequence
5. **If score < threshold** — "Do better!" with your score; OK opens the item in Zotero

## Requirements

- [Obsidian](https://obsidian.md) v1.4+
- [Zotero](https://www.zotero.org) with [Better BibTeX](https://retorque.re/zotero-better-bibtex/) (required for PDF-assisted mode)
- [better-notes](https://github.com/jsglazer/better-notes) Zotero plugin (syncs notes to Obsidian with `$itemKey` frontmatter)
- An [Anthropic API key](https://console.anthropic.com)
- Python 3 + `pymupdf` + `ocrmypdf` (PDF-assisted mode only)

## Settings

| Setting | Default | Description |
|---|---|---|
| Anthropic API key | — | Your Anthropic API key |
| Claude model | claude-sonnet-4-6 | Model used for grading |
| Grade threshold | 75 | Minimum score to pass |
| Grading mode | Note-only | Note-only or PDF-assisted |
| PDF extraction script | *(blank)* | Path to `pdf_to_markdown.py` |
| Use venv | off | Use a Python virtual environment |
| venv path | *(blank)* | Path to venv root |
| Use OCR | on | Run Tesseract OCR (needed for scanned PDFs) |
| Zotero key field | $itemKey | Frontmatter field with the Zotero item key |
| Claude-note format | (template) | Template for the Claude Notes section |
| Note sections | Core Claims, Methodology, Counter Arguments, General Notes, References | Comma-separated list of section headings the plugin expects in your notes |

## Note Format

The plugin looks for whatever section headings you configure in **Settings → Note sections**. The default set matches the better-notes template:

```
## Core Claims
## Methodology
## Counter Arguments
## General Notes
## References
```

If your notes use different headings (e.g. `## Main Argument`, `## Methods`, `## Critique`), update the Note sections setting to match. The plugin shows an error if any configured section is missing from the active note.

## Python Setup (Mac, PDF-assisted mode only)

PDF-assisted mode uses a Python script to extract and OCR scanned PDFs. You only need this if you plan to use that mode — note-only mode requires nothing.

### 1. Install Homebrew (if you don't have it)

Open Terminal and run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Python 3

macOS ships with an older Python. Install a current version via Homebrew:

```bash
brew install python
```

Verify it works:

```bash
python3 --version
```

### 3. Install OCR dependencies

The extraction script uses Tesseract (OCR engine) and Ghostscript (PDF processing):

```bash
brew install tesseract ghostscript
```

If you work with non-English papers, also install the relevant language packs:

```bash
brew install tesseract-lang
```

### 4. Create a virtual environment

A virtual environment keeps the Python packages for this script isolated from the rest of your system. Pick a location — `/Users/you/Dev/.venv` is a good convention:

```bash
python3 -m venv /Users/you/Dev/.venv
```

### 5. Install the Python packages

```bash
/Users/you/Dev/.venv/bin/pip install pymupdf ocrmypdf
```

### 6. Configure the plugin settings

In Obsidian → Settings → Note Review:

| Setting | Value |
|---|---|
| Grading mode | PDF-assisted |
| PDF extraction script path | `/path/to/pdf_to_markdown.py` |
| Use Python virtual environment | on |
| venv path | `/Users/you/Dev/.venv` |
| Use OCR | on (leave on unless you only ever read born-digital PDFs) |

The green/red dot next to each path field confirms whether the plugin can find the file. Both dots should be green before you run a review.

### Notes

- The plugin auto-detects whether a PDF needs OCR. Born-digital PDFs (text is selectable in Preview) are extracted in-process without calling the Python script. The script is only invoked for scanned PDFs.
- OCR is slow — 15–30 seconds for a typical 20-page paper. This is normal.
- If the dot next to the venv path is red, check that the path is the venv *root* (the folder containing `bin/`), not the `bin/python3` file itself.

## License

MIT
