/**
 * CertificateEntryRows: the read-only list of certificates a competition's results ask for (board
 * G14, "Certificates to sign"; bundle BOOKS-8, part 8c).
 *
 * What it shows: one row per entrant, an initial in a circle, the pen name and a meta line with
 * the result and the story they entered; a Readers' choice entrant gets a second row, "Readers'
 * choice · a second certificate", because that is a certificate of its own (Robert, 13 Nov 2026,
 * decisions 4, 16 and 17).
 * Who shows it: CompetitionCertificatesForm. What it calls: MetaLine.
 */
import { MetaLine } from '@/components/ui/MetaLine';

import type { CertificateResult } from '../api/certificates';
import type { ConfirmedEntrant } from '../lib/competitionCertificates';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/** One entrant as the list shows them. */
export interface CompetitionCertificateEntrant extends ConfirmedEntrant {
  displayName: string;
  /** The chapters they entered; the first one's story names the entry. */
  chapters: readonly { storyTitle: string }[];
}

/** One row: who, which certificate, and what the second fact says. */
interface EntryRow {
  key: string;
  name: string;
  result: CertificateResult;
  detail: string;
}

/**
 * The rows, in order: each entrant's result, then their Readers' choice certificate if any.
 *
 * @param entrants - the pupils who entered
 * @param secondCertificate - the words for a Readers' choice row's second fact
 * @returns the rows
 */
function rowsOf(entrants: CompetitionCertificateEntrant[], secondCertificate: string): EntryRow[] {
  const rows: EntryRow[] = [];
  for (const entrant of entrants) {
    const result = entrant.result ?? 'participant';
    const story = entrant.chapters[0]?.storyTitle ?? '';
    rows.push({
      key: `${entrant.handle}-${result}`,
      name: entrant.displayName,
      result,
      detail: story,
    });
    if (entrant.isReadersChoice) {
      rows.push({
        key: `${entrant.handle}-readers_choice`,
        name: entrant.displayName,
        result: 'readers_choice',
        detail: secondCertificate,
      });
    }
  }
  return rows;
}

/**
 * Renders the list.
 *
 * @param props.entrants - the pupils who entered
 * @returns the list
 */
export function CertificateEntryRows({ entrants }: { entrants: CompetitionCertificateEntrant[] }) {
  const { t } = useCertificatesTranslation();
  return (
    <ul aria-label={t('class.toSignLabel')} className="m-0 flex list-none flex-col p-0">
      {rowsOf(entrants, t('class.secondCertificate')).map((row) => (
        <li key={row.key} className="flex items-center gap-4 border-t border-hairline py-3">
          {/* The first letter of the pen name: a stand-in for the avatar, hidden from screen readers. */}
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-tint type-meta font-semibold text-ink-heading"
          >
            {row.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="type-label break-words text-ink-heading">{row.name}</span>
            <MetaLine
              facts={[{ text: t(`results.${row.result}`), kind: 'state' }, { text: row.detail }]}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
