/**
 * LegalVersionHistory: every version of a document, newest first (story S1-E14-01; terms,
 * section 8: "Older versions stay on this page, in Romanian and English").
 *
 * Board 7.2 "Version history": a row per version on the panel colour with "Version 0.1 · date" and
 * a gold "Draft" pill while no lawyer has checked it, then the note about sign-up and Settings.
 * Who uses it: LegalDocumentView, under the sections.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

import type { LegalVersionSummary } from '../lib/chooseLegalVersion';
import { formatLegalDate } from '../lib/legalDocumentList';

/** What the list needs. */
interface LegalVersionHistoryProps {
  history: LegalVersionSummary[];
}

/**
 * Renders the history.
 *
 * @returns a section with a heading and one row per version
 */
export function LegalVersionHistory({ history }: LegalVersionHistoryProps) {
  const { t, i18n } = useTranslation('legal');
  return (
    <section aria-labelledby="legal-version-history" className="flex flex-col gap-3">
      <h3
        id="legal-version-history"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('history.heading')}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {history.map((version) => (
          <li
            key={version.versionLabel}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-panel px-4 py-3"
          >
            <span className="text-body">
              {t('history.item', {
                version: version.versionLabel,
                date: formatLegalDate(version.publishedAt, i18n.language),
              })}
            </span>
            {!version.isLawyerReviewed && <InfoPill tone="gold">{t('history.draft')}</InfoPill>}
          </li>
        ))}
      </ul>
      <p className="m-0 text-sm text-meta">{t('history.note')}</p>
    </section>
  );
}
