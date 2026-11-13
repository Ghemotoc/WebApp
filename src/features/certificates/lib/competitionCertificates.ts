/**
 * competitionCertificates: a class competition's confirmed results as the list
 * issue_class_certificates() takes (bundle CLASS-POINTS, part 3; story S1-E8-17).
 *
 * Who calls it: CompetitionCertificatesForm. The database checks every line against the
 * competition's results again (check_class_certificate_result()), so this file only saves the
 * teacher from typing what they already confirmed.
 */
import type { ClassResultEntry } from '../api/classCertificates';
import type { CertificateResult } from '../api/certificates';

/** One pupil who entered, with what the teacher confirmed for them. */
export interface ConfirmedEntrant {
  handle: string;
  /** Winner, Finalist or Contestant ('participant'); null while the results aren't confirmed. */
  result: Exclude<CertificateResult, 'readers_choice'> | null;
  /** True when classmates gave this pupil's chapters the most class points. */
  isReadersChoice: boolean;
}

/**
 * The certificates a competition's results ask for: one per entrant for their result, and a
 * second one for a Readers' choice entrant (Robert, 13 Nov 2026, decisions 4, 16 and 17).
 *
 * @param entrants - the pupils who entered, with their confirmed results
 * @returns one line per certificate; an entrant without a result gets none
 */
export function competitionCertificateEntries(entrants: ConfirmedEntrant[]): ClassResultEntry[] {
  const entries: ClassResultEntry[] = [];
  for (const entrant of entrants) {
    // Only a confirmed result becomes a certificate.
    if (entrant.result === null) continue;
    entries.push({ handle: entrant.handle, result: entrant.result });
    // Readers' choice is its own certificate beside the result.
    if (entrant.isReadersChoice) entries.push({ handle: entrant.handle, result: 'readers_choice' });
  }
  return entries;
}
