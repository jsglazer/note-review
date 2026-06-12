# note-review

[![CI](https://github.com/jsglazer/note-review/actions/workflows/ci.yml/badge.svg)](https://github.com/jsglazer/note-review/actions/workflows/ci.yml)
[![CodeQL](https://github.com/jsglazer/note-review/actions/workflows/codeql.yml/badge.svg)](https://github.com/jsglazer/note-review/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/jsglazer/note-review/badge)](https://securityscorecards.dev/viewer/?uri=github.com/jsglazer/note-review)

An Obsidian plugin that grades your Zotero research notes using an AI language model and helps you improve your academic analysis. Supports Claude, OpenAI, Google Gemini, and local LLMs (Ollama, LM Studio).

## Workflow

1. Open a Zotero-synced note in Obsidian
2. Trigger **Review note** (ribbon icon or command palette)
3. The active AI provider grades your note on four criteria (0–100):
   - Main idea correctly identified
   - Major points captured
   - Accuracy (no significant errors)
   - Depth and critical insight
4. **If score ≥ threshold** — a modal shows your grade with four options:
   - **Stop** — close, nothing written
   - **Retry** — open the source item in Zotero to keep working
   - **AI Notes** — append the AI's full analysis of the paper (`# Claude Notes`): Summary, Core Claims, Methodology, Counter Arguments, General Notes, References
   - **AI Review** — appends a separate `# Claude Review` section listing what you missed or got wrong per section; your original text is never modified
   - Both buttons are independent — you can click either, or both in sequence
5. **If score < threshold** — "Do better!" with your score; OK opens the item in Zotero

## Requirements

- [Obsidian](https://obsidian.md) v1.4+
- [Zotero](https://www.zotero.org) with [Better BibTeX](https://retorque.re/zotero-better-bibtex/) (required for PDF-assisted mode)
- [better-notes](https://github.com/jsglazer/better-notes) Zotero plugin (syncs notes to Obsidian with `$itemKey` frontmatter)
- An API key for your chosen provider (not required for local LLMs)
- Python 3 + `pymupdf` + `ocrmypdf` (PDF-assisted mode only)

## AI Provider

Select your provider in **Settings → AI Provider → Provider**. Only the fields for the active provider are shown.

### Claude (Anthropic) — default

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Set **Provider** to `Claude (Anthropic)`
3. Paste the key into **Anthropic API key**
4. Choose a model (Sonnet 4.6 is the default; Opus 4.8 is more capable but slower and more expensive)

| Model | Speed | Cost | Best for |
|---|---|---|---|
| Claude Sonnet 4.6 | Fast | Mid | Daily use |
| Claude Opus 4.8 | Slower | Higher | Demanding analysis |
| Claude Haiku 4.5 | Fastest | Lowest | Quick checks |

### OpenAI

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Set **Provider** to `OpenAI`
3. Paste the key into **OpenAI API key**
4. Choose a model

| Model | Speed | Cost | Best for |
|---|---|---|---|
| GPT-4o | Fast | Mid | Daily use |
| GPT-4o mini | Fastest | Lowest | Quick checks |
| GPT-4 Turbo | Mid | Higher | Demanding analysis |
| GPT-3.5 Turbo | Fast | Lowest | Budget option |

### Google Gemini

1. Get an API key from [aistudio.google.com](https://aistudio.google.com)
2. Set **Provider** to `Google Gemini`
3. Paste the key into **Gemini API key**
4. Choose a model

| Model | Speed | Cost | Best for |
|---|---|---|---|
| Gemini 2.0 Flash | Fastest | Lowest | Daily use |
| Gemini 1.5 Pro | Mid | Higher | Demanding analysis |
| Gemini 1.5 Flash | Fast | Low | Budget option |

### OpenAI-compatible (local LLMs — Ollama, LM Studio, etc.)

Run any model locally with no API key and no per-request cost. Requires downloading and running a local inference server first.

**Ollama** ([ollama.com](https://ollama.com)):

```bash
# Install Ollama, then pull a model
ollama pull llama3.2        # ~2 GB, good all-rounder
ollama pull mistral         # ~4 GB, strong at structured output
ollama pull phi4            # ~8 GB, excellent reasoning

# Ollama starts automatically and serves at http://localhost:11434
```

**LM Studio** ([lmstudio.ai](https://lmstudio.ai)): download a GGUF model from the app, then start the local server from the Developer tab. Default URL is `http://localhost:1234/v1`.

**Plugin settings:**

| Setting | Ollama | LM Studio |
|---|---|---|
| Provider | OpenAI-compatible | OpenAI-compatible |
| Base URL | `http://localhost:11434/v1` | `http://localhost:1234/v1` |
| API key | *(leave blank)* | *(leave blank)* |
| Model name | Exact name as pulled, e.g. `llama3.2` | Exact model name shown in LM Studio |

**Model name tips:**
- Ollama: `ollama list` in Terminal shows what you have installed
- LM Studio: the model name shown in the Developer tab's model selector
- Use models with at least 7B parameters for reliable JSON output; 13B+ recommended for best results

## Settings reference

### AI Provider

| Setting | Description |
|---|---|
| Provider | Which AI backend to use: Claude, OpenAI, OpenAI-compatible, or Gemini |
| Anthropic API key | Your Anthropic key (Claude provider only) |
| Claude model | Sonnet 4.6 / Opus 4.8 / Haiku 4.5 |
| OpenAI API key | Your OpenAI key (OpenAI provider only) |
| OpenAI model | GPT-4o / GPT-4o mini / GPT-4 Turbo / GPT-3.5 Turbo |
| Base URL | Endpoint for OpenAI-compatible servers |
| API key (optional) | Auth key for OpenAI-compatible servers; leave blank for Ollama / LM Studio |
| Model name | Exact model name for OpenAI-compatible servers |
| Gemini API key | Your Google AI Studio key (Gemini provider only) |
| Gemini model | 2.0 Flash / 1.5 Pro / 1.5 Flash |

### Grading

| Setting | Default | Description |
|---|---|---|
| Grade threshold | 75 | Minimum score to pass |
| Grading mode | Note-only | Note-only or PDF-assisted |

### PDF extraction

| Setting | Default | Description |
|---|---|---|
| PDF extraction script | *(blank)* | Path to `pdf_to_markdown.py` |
| Use venv | off | Use a Python virtual environment |
| venv path | *(blank)* | Path to venv root |
| Use OCR | on | Run Tesseract OCR (needed for scanned PDFs) |

### Other

| Setting | Default | Description |
|---|---|---|
| Zotero key field | $itemKey | Frontmatter field with the Zotero item key |
| Note sections | Core Claims, … | Comma-separated section headings |
| AI note template | (template) | Template for the `# Claude Notes` section |

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

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Python 3

```bash
brew install python
python3 --version
```

### 3. Install OCR dependencies

```bash
brew install tesseract ghostscript
```

For non-English papers:

```bash
brew install tesseract-lang
```

### 4. Create a virtual environment

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

- The plugin auto-detects whether a PDF needs OCR. Born-digital PDFs are extracted in-process without calling the Python script. The script is only invoked for scanned PDFs.
- OCR is slow — 15–30 seconds for a typical 20-page paper. This is normal.
- If the dot next to the venv path is red, check that the path is the venv *root* (the folder containing `bin/`), not the `bin/python3` file itself.

## License

MIT
