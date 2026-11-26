/**
 * LegalVersionHistory: every version of a document, newest first (story S1-E14-01; terms,
 * section 8: "Older versions stay on this page, in Romanian and English").
 *
 * Board J08 (user stories, bundle 10), side column "Version history": a row per version with
 * "Version 1.0 · date" in bold and, while no lawyer has checked it, "Draft" on a meta line under
 * it; rows are split by fine lines; then the note about sign-up and Settings in the small meta size.
 * Who uses it: LegalDocumentView, in the side column.
 */
import { useTranslation } from 'react-i18next';

import { MetaLine } from '@/components/ui/MetaLine';

import type { LegalVersionSummary } from '../lib/chooseLegalVersion';
import { formatLegalDate } from '../lib/legalDocumentList';

/** What the list needs. */
interface LegalVersionHistoryProps {
  history: LegalVersionSummary[];
}

/**
 * Renders the history.
 *
 * @returns the section with its heading, rows and note
 */
export function LegalVersionHistory({ history }: LegalVersionHistoryProps) {
  const { t, i18n } = useTranslation('legal');
  return (
    <section aria-labelledby="legal-version-history" className="flex flex-col gap-2">
      <h3
        id="legal-version-history"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('history.heading')}
      </h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {history.map((version) => (
          <li
            key={version.versionLabel}
            className="flex flex-col gap-1 border-b border-hairline py-3 last:border-b-0"
          >
            {/* Step 1: the version and its date, in bold as on the board. */}
            <span className="type-body font-semibold text-ink-heading">
              {t('history.item', {
                version: version.versionLabel,
                date: formatLegalDate(version.publishedAt, i18n.language),
              })}
            </span>
            {/* Step 2: "Draft" while no lawyer has checked this version. */}
            {!version.isLawyerReviewed && (
              <MetaLine facts={[{ text: t('history.draft'), kind: 'state' }]} />
            )}
          </li>
        ))}
      </ul>
      <p className="m-0 type-meta text-ink-muted">{t('history.note')}</p>
    </section>
  );
}
