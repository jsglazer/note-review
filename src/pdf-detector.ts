import { readFile } from 'fs/promises';
import { PDFParse } from 'pdf-parse';

// Minimum average characters per page to consider a PDF born-digital (not needing OCR).
const MIN_CHARS_PER_PAGE = 100;

export type PDFReadability = 'digital' | 'scanned';

export interface PDFProbeResult {
	readability: PDFReadability;
	avgCharsPerPage: number;
	pageCount: number;
}

export async function probePDF(pdfPath: string): Promise<PDFProbeResult> {
	const buffer = await readFile(pdfPath);
	const parser = new PDFParse({ data: buffer });

	// Probe only the first 5 pages to keep it fast
	const result = await parser.getText({ first: 5 });

	const pageCount = result.total;
	const pagesProbed = result.pages.length;
	const charCount = result.text.replace(/\s+/g, '').length;
	const avgCharsPerPage = pagesProbed > 0 ? charCount / pagesProbed : 0;
	const readability: PDFReadability = avgCharsPerPage >= MIN_CHARS_PER_PAGE ? 'digital' : 'scanned';

	return { readability, avgCharsPerPage, pageCount };
}

export async function extractDigitalPDFText(pdfPath: string): Promise<string> {
	const buffer = await readFile(pdfPath);
	const parser = new PDFParse({ data: buffer });
	const result = await parser.getText();
	return result.text.trim();
}
