/**
 * Packs the data file and the Word files into the one ZIP of Download my data (story S1-E13-02;
 * decided 17 Oct 2026, 12:34: one ZIP with a machine-readable JSON file plus every story as a
 * Word file, no HTML copy).
 *
 * Inside the ZIP:
 *   data.json            everything about the account (GDPR art. 20: structured, commonly used
 *                        and machine-readable), pretty-printed so a person can read it too;
 *   stories/<slug>.docx  one Word file per story (GDPR art. 15(3): a commonly used electronic form);
 *   stories/<slug>-plan.docx  the story's plan from Story Atlas (S1-E13-05; Robert, 1 Nov 2026).
 * Who calls it: runDataExport(). What it calls: JSZip, in the browser (ADR 0012).
 */
import JSZip from 'jszip';

/** One Word file for the ZIP. */
export interface ZipEntry {
  /** Its path inside the ZIP, for example "stories/rain.docx". */
  fileName: string;
  bytes: Uint8Array;
}

/** The data file's name inside the ZIP. */
export const DATA_FILE_NAME = 'data.json';

/**
 * Builds the ZIP.
 *
 * @param document - the data file's contents (my_data_export()'s answer)
 * @param wordFiles - the stories' Word files
 * @returns the ZIP's bytes
 * @throws when JSZip can't build it (the caller shows its plain message)
 */
export async function buildExportZip(
  document: unknown,
  wordFiles: ZipEntry[],
): Promise<Uint8Array> {
  const zip = new JSZip();
  // Step 1: the data file, indented by two spaces and in UTF-8, so ș and ț stay ș and ț.
  zip.file(DATA_FILE_NAME, JSON.stringify(document, null, 2));
  // Step 2: the Word files, already compressed inside, so they are stored as they are.
  for (const entry of wordFiles) zip.file(entry.fileName, entry.bytes, { compression: 'STORE' });
  // Step 3: the ZIP itself, compressed.
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

/**
 * A ZIP of the chosen files only, for Download my stories (S1-E13-05): the stories' and plans'
 * Word files and, when ticked, the JSON copy, all at the top of the ZIP.
 *
 * @param files - the files, the Word files named "stories/<slug>.docx"
 * @returns the ZIP's bytes
 */
export async function buildWordZip(files: ZipEntry[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const entry of files) {
    // The "stories/" folder only makes sense next to the data file, so it goes here.
    zip.file(entry.fileName.replace(/^stories\//, ''), entry.bytes, { compression: 'STORE' });
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
