export class ZoteroService {
	async openInZotero(itemKey: string): Promise<void> {
		const uri = `zotero://select/library/items/${itemKey}`;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const electron = (window as any).require?.("electron");
		if (electron?.shell) {
			electron.shell.openExternal(uri);
		} else {
			window.open(uri, "_blank");
		}
	}

	async getPDFPath(itemKey: string, libraryId: string): Promise<string> {
		const base = "http://127.0.0.1:23119/better-bibtex";

		await this.checkBBTRunning(base);

		const rpcPayload = {
			jsonrpc: "2.0",
			method: "item.attachments",
			params: [{ citekey: itemKey }],
			id: 1,
		};

		const response = await fetch(`${base}/json-rpc`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(rpcPayload),
		});

		if (!response.ok) {
			throw new Error(
				`BBT JSON-RPC error ${response.status}: ${response.statusText}`
			);
		}

		const data = await response.json();
		if (data.error) {
			throw new Error(`BBT returned error: ${JSON.stringify(data.error)}`);
		}

		const attachments: Array<{ path?: string; contentType?: string }> =
			data.result ?? [];
		const pdf = attachments.find(
			(a) => a.contentType === "application/pdf" && a.path
		);

		if (!pdf?.path) {
			throw new Error(
				`No PDF attachment found for item key "${itemKey}" (library ${libraryId}).`
			);
		}

		return pdf.path;
	}

	private async checkBBTRunning(base: string): Promise<void> {
		try {
			const resp = await fetch(`${base}/cayw?probe=true`, {
				signal: AbortSignal.timeout(3000),
			});
			if (!resp.ok) throw new Error();
		} catch {
			throw new Error(
				"Better BibTeX does not appear to be running. Please open Zotero with BBT installed to use PDF-assisted mode."
			);
		}
	}
}
