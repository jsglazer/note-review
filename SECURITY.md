# Security Policy

## Supported versions

Only the latest released version of Note Review receives fixes. Please update to
the newest release before reporting an issue.

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue:

- Use GitHub's **"Report a vulnerability"** button under the repository's
  **Security** tab (Privately report a vulnerability), or
- open a regular issue **without** sensitive details and ask for a private channel.

Please include reproduction steps and the plugin version (see `manifest.json`).
You can expect an initial response within a reasonable time; fixes are released as
a new version.

## Scope & threat model

Note Review runs inside Obsidian. It reads your Zotero-synced research notes and
sends the note content you select to an LLM provider **you** configure, using
**your own** API key, in order to grade the notes and append the analysis.

- Network requests go only to the LLM endpoint you specify in settings. The plugin
  adds no telemetry and transmits nothing else.
- Your API key is stored in Obsidian's plugin settings on your machine; treat it as
  a secret and do not commit your `data.json`.
- Note content is treated as untrusted input; file access uses the sandboxed
  Obsidian Vault API with `normalizePath()`.
