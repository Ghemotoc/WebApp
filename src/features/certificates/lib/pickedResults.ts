/**
 * pickedResults: the teacher's drop-down choices as the list issue_class_certificates() takes
 * (bundle CLASSES, part e; story S1-E8-12 criterion 1).
 *
 * Who calls it: ClassResultsForm. Students left on "No certificate" are left out.
 */
import { certificateResults } from '../api/certificates';
import type { ClassResultEntry } from '../api/classCertificates';

/**
 * The lines with a result picked, ready to send.
 *
 * @param picked - the result picked per username ("" for none)
 * @returns one entry per student with a result
 */
export function pickedResults(picked: Record<string, string>): ClassResultEntry[] {
  const entries: ClassResultEntry[] = [];
  for (const [handle, value] of Object.entries(picked)) {
    const result = certificateResults.find((known) => known === value);
    if (result !== undefined) entries.push({ handle, result });
  }
  return entries;
}
