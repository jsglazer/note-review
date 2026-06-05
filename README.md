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
   - **Claude Notes** — append Claude's own analysis of the paper (`# Claude Notes`)
   - **Claude Review** — append a section listing what you missed or got wrong (`# Claude Review`)
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

## Note Format

Notes must contain these sections (written by better-notes):

```
## Core Claims
## Methodology
## Counter Arguments
## General Notes
## References
```

The plugin shows an error if any section is missing.

## License

MIT
