/**
 * LegalDocumentView: one legal document, as on board 7.2 (story S1-E14-01).
 *
 * Who uses it: LegalCentrePage, once the versions have loaded.
 * What it shows: two columns from a tablet up, as on board J08 (user stories, bundle 10). The main
 * column holds the title and the board's one-line introduction; the status line (draft, version,
 * date, languages); notes when the text is a draft translation, when it is shown in English because
 * the reader's language has none yet, and what "After the invited test" means; the document's own
 * "In short" in the same tinted box as each section's; then the sections one under another, each
 * with its full text folded. The side column holds the version history and "Questions or a
 * report?". On a phone the side column follows the main one.
 * What it calls: fillBrandTokens (brand values from src/config/brand.ts) and parseLegalDocument.
 */
import { useTranslation } from 'react-i18next';

import { MetaLine } from '@/components/ui/MetaLine';
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
import { LegalQuestions } from './LegalQuestions';
import { LegalVersionHistory } from './LegalVersionHistory';

/** What the view needs. */
interface LegalDocumentViewProps {
  documentSlug: LegalDocumentSlug;
  /** The version to show, from chooseLegalVersion; current is never null here. */
  chosen: ChosenLegalVersion & { current: NonNullable<ChosenLegalVersion['current']> };
}

/**
 * The status line under the title: draft or checked, version, date and languages (a meta line
 * since CALM-9d).
 *
 * @returns a labelled meta line
 */
function LegalStatusPills({ chosen }: Pick<LegalDocumentViewProps, 'chosen'>) {
  const { t, i18n } = useTranslation('legal');
  const { current, history } = chosen;
  const hasBothLanguages = ['ro', 'en'].every((language) =>
    history[0]?.languages.includes(language),
  );
  // CALM-9d: one meta line, the draft or checked state first in bold, then the facts.
  return (
    <MetaLine
      label={t('status.label')}
      facts={[
        {
          text: current.is_lawyer_reviewed ? t('status.reviewed') : t('status.draft'),
          kind: 'state',
        },
        { text: t('status.version', { version: current.version_label }) },
        {
          text: t('status.updated', { date: formatLegalDate(current.published_at, i18n.language) }),
        },
        { text: hasBothLanguages ? t('status.bothLanguages') : '' },
      ]}
    />
  );
}

/**
 * The title, the board's one-line introduction and the status line. Only the legal text carries
 * its own language (lang); the interface text around it is in the interface language (WCAG 2.2,
 * 3.1.2).
 *
 * @returns the header
 */
function LegalDocumentHeader({ documentSlug, chosen }: LegalDocumentViewProps) {
  const { t } = useTranslation('legal');
  return (
    <div className="flex flex-col gap-3">
      <h2
        id="legal-document-title"
        lang={chosen.current.language}
        className="m-0 font-heading type-title font-bold text-ink-heading"
      >
        {fillBrandTokens(chosen.current.title, brand)}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t(`documents.${documentSlug}.intro`)}</p>
      <LegalStatusPills chosen={chosen} />
    </div>
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
    <div className="flex flex-wrap items-start gap-x-16 gap-y-12">
      <section
        aria-labelledby="legal-document-title"
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-8 lg:max-w-[760px]"
      >
        <LegalDocumentHeader documentSlug={documentSlug} chosen={chosen} />
        {/* Notes about the text itself. */}
        {isDraftTranslation && <Notice tone="warning">{t('translationDraft')}</Notice>}
        {chosen.isFallbackLanguage && <Notice tone="info">{t('fallbackLanguage')}</Notice>}
        {hasAfterTheTestParts && <Notice tone="info">{t('afterTheTest.explanation')}</Notice>}
        {/* The document's own summary, in the tinted box every section's short version uses. */}
        <div className="flex flex-col gap-1 rounded-field bg-tint p-4">
          <h3 className="m-0 type-label font-semibold text-ink-heading">{t('summaryHeading')}</h3>
          <LegalMarkdown markdown={parsed.summaryMarkdown} language={current.language} />
        </div>
        {parsed.sections.map((section) => (
          <LegalSectionCard
            key={`${section.number ?? 'note'}-${section.title}`}
            section={section}
            isLawyerReviewed={current.is_lawyer_reviewed}
            textLanguage={current.language}
          />
        ))}
        {/* "Your country" and "Ages by country", under the privacy notice and the terms (MARKETS-1). */}
        {(documentSlug === 'privacy' || documentSlug === 'terms') && <CountryLegalSections />}
      </section>
      {/* The side column, as on the board. */}
      <aside
        aria-label={t('sideColumnLabel')}
        className="flex min-w-0 flex-[1_1_260px] flex-col gap-12 lg:max-w-[360px]"
      >
        <LegalVersionHistory history={chosen.history} />
        <LegalQuestions />
      </aside>
    </div>
  );
}
