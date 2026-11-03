/**
 * Loads the PDF library (pdfmake, MIT licence) and its fonts only when someone asks for a PDF, so
 * the reader's own pages never carry its weight (bundle ADMIN-2, part d; story S1-E11-09b).
 *
 * Why pdfmake: it builds the file in the person's own browser, like the Word builder does
 * (ADR 0012), it wraps text, breaks pages and draws pictures and lists, and its Roboto font has
 * every Romanian letter (ă, â, î, ș, ț). Q49 (the PDF tool) is OPEN: this is a proposal, flagged
 * in the pull request, and swapping the library touches only src/lib/pdf/.
 * Who calls it: storyToPdf() and planToPdf(). What it calls: the pdfmake browser build and its
 * font file, each loaded once and then kept.
 */
import type { TCreatedPdf, TDocumentDefinitions } from 'pdfmake/interfaces';

/** The parts of pdfmake the builder uses. */
interface PdfMakeLibrary {
  addVirtualFileSystem: (files: Record<string, string>) => void;
  setUrlAccessPolicy: (callback: (url: string) => boolean) => void;
  createPdf: (definition: TDocumentDefinitions) => TCreatedPdf;
}

/** The library once it is ready, so the second PDF doesn't load it again. */
let readyLibrary: Promise<PdfMakeLibrary> | null = null;

/** A module's default export when the bundler wraps it in one, or the module itself. */
function unwrapModule<Value>(loaded: unknown): Value {
  if (typeof loaded === 'object' && loaded !== null && 'default' in loaded) {
    return (loaded as { default: Value }).default;
  }
  return loaded as Value;
}

/** Loads the library and its fonts, and stops it from fetching anything over the network. */
async function loadLibrary(): Promise<PdfMakeLibrary> {
  // Step 1: the library and the font file, side by side.
  const [libraryModule, fontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const library = unwrapModule<PdfMakeLibrary>(libraryModule);
  // Step 2: the Roboto fonts, which the library uses by default.
  library.addVirtualFileSystem(unwrapModule<Record<string, string>>(fontsModule));
  // Step 3: no web addresses at all. Pictures arrive as bytes we already checked, and a link in
  // the text stays a link in the file; nothing is downloaded while the file is built.
  library.setUrlAccessPolicy(() => false);
  return library;
}

/**
 * Answers the PDF library, loading it the first time.
 *
 * @returns pdfmake, with its fonts added
 * @throws when the library can't be loaded (for example the connection dropped); the next call
 *   tries again
 */
export function loadPdfMake(): Promise<PdfMakeLibrary> {
  if (readyLibrary === null) {
    readyLibrary = loadLibrary().catch((error: unknown) => {
      // Forget the failed attempt so a retry can load it.
      readyLibrary = null;
      throw error;
    });
  }
  return readyLibrary;
}

/**
 * Builds a PDF file from a pdfmake definition.
 *
 * @param definition - the pages' content, styles and file details
 * @returns the .pdf file's bytes
 * @throws when the library can't load or can't build the file (the caller shows its plain message)
 */
export async function pdfDocumentBytes(definition: TDocumentDefinitions): Promise<Uint8Array> {
  const library = await loadPdfMake();
  const buffer = await library.createPdf(definition).getBuffer();
  return new Uint8Array(buffer);
}
