/**
 * LegalDocumentView: one legal document, as on board 7.2 (story S1-E14-01).
 *
 * Who uses it: LegalCentrePage, once the versions have loaded.
 * What it shows, top to bottom: the title and the board's one-line introduction; the status pills
 * (draft, version, date, languages); notes when the text is a draft translation, when it is shown in
 * English because the reader's language has none yet, and what "After the invited test" means; the
 * document's own "In short"; the sections in a two-column grid on wide screens; the version history.
 * What it calls: fillBrandTokens (brand values from src/config/brand.ts) and parseLegalDocument.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { brand } from '@/config/brand';

import type { ChosenLegalVersion } from '../lib/chooseLegalVersion';
import { fillBrandTokens } from '../lib/fillBrandTokens';
import { afterTheInvitedTestMarker } from '../lib/legalMarks';
import { formatLegalDate, type LegalDocumentSlug } from '../lib/legalDocumentList';
import { parseLegalDocument } from '../lib/parseLegalDocument';

import { LegalMarkdown } from './LegalMarkdown';
import { LegalSectionCard } from './LegalSectionCard';
import { CountryLegalSections } from './CountryLegalSections';
import { LegalVersionHistory } from './LegalVersionHistory';

/** What the view needs. */
interface LegalDocumentViewProps {
  documentSlug: LegalDocumentSlug;
  /** The version to show, from chooseLegalVersion; current is never null here. */
  chosen: ChosenLegalVersion & { current: NonNullable<ChosenLegalVersion['current']> };
}

/**
 * The status pills under the title: draft or checked, version, date and languages.
 *
 * @returns a labelled list of pills
 */
function LegalStatusPills({ chosen }: Pick<LegalDocumentViewProps, 'chosen'>) {
  const { t, i18n } = useTranslation('legal');
  const { current, history } = chosen;
  const hasBothLanguages = ['ro', 'en'].every((language) =>
    history[0]?.languages.includes(language),
  );
  return (
    <ul aria-label={t('status.label')} className="m-0 flex list-none flex-wrap gap-2 p-0">
      <li>
        <InfoPill tone="gold">
          {current.is_lawyer_reviewed ? t('status.reviewed') : t('status.draft')}
        </InfoPill>
      </li>
      <li>
        <InfoPill tone="neutral">
          {t('status.version', { version: current.version_label })}
        </InfoPill>
      </li>
      <li>
        <InfoPill tone="neutral">
          {t('status.updated', { date: formatLegalDate(current.published_at, i18n.language) })}
        </InfoPill>
      </li>
      {hasBothLanguages && (
        <li>
          <InfoPill tone="neutral">{t('status.bothLanguages')}</InfoPill>
        </li>
      )}
    </ul>
  );
}

/**
 * Renders the document.
 *
 * @returns the document's section of the page
 */
export function LegalDocumentView({ documentSlug, chosen }: LegalDocumentViewProps) {
  const { t } = useTranslation('legal');
  const { current } = chosen;
  // Step 1: fill the brand values, then cut the text into its parts.
  const body = fillBrandTokens(current.body_markdown, brand);
  const parsed = parseLegalDocument(body);
  const hasAfterTheTestParts = body.includes(afterTheInvitedTestMarker);
  const isDraftTranslation = current.language === 'ro' && !current.is_lawyer_reviewed;

  return (
    <section aria-labelledby="legal-document-title" className="flex flex-col gap-6">
      {/* Title, introduction and status. Only the legal text carries its own language (lang); the
          interface text around it is in the interface language (WCAG 2.2, 3.1.2). */}
      <div className="flex flex-col gap-3">
        <h2
          id="legal-document-title"
          lang={current.language}
          className="m-0 font-heading text-[30px] font-bold text-heading"
        >
          {fillBrandTokens(current.title, brand)}
        </h2>
        <p className="m-0 max-w-[720px] text-[17px] text-body">
          {t(`documents.${documentSlug}.intro`)}
        </p>
        <LegalStatusPills chosen={chosen} />
      </div>
      {/* Notes about the text itself. */}
      {isDraftTranslation && <Notice tone="warning">{t('translationDraft')}</Notice>}
      {chosen.isFallbackLanguage && <Notice tone="info">{t('fallbackLanguage')}</Notice>}
      {hasAfterTheTestParts && <Notice tone="info">{t('afterTheTest.explanation')}</Notice>}
      {/* The document's own summary, then every section. */}
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
        <h3 className="m-0 font-heading text-[22px] font-bold text-heading">
          {t('summaryHeading')}
        </h3>
        <LegalMarkdown markdown={parsed.summaryMarkdown} language={current.language} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-5">
        {parsed.sections.map((section) => (
          <LegalSectionCard
            key={`${section.number ?? 'note'}-${section.title}`}
            section={section}
            isLawyerReviewed={current.is_lawyer_reviewed}
            textLanguage={current.language}
          />
        ))}
      </div>
      {/* "Your country" and "Ages by country", under the privacy notice and the terms (MARKETS-1). */}
      {(documentSlug === 'privacy' || documentSlug === 'terms') && <CountryLegalSections />}
      <LegalVersionHistory history={chosen.history} />
    </section>
  );
}
