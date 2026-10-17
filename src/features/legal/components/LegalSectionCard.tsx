/**
 * LegalSectionCard: one numbered section of a legal document, as on board 7.2 (story S1-E14-01).
 *
 * Board values (design/boards/Legal.dc.html): a white card, a 34 px numbered circle and a 22 px
 * title, the eyebrow "In short" with the short bullets, then a dashed box "Full text · draft for
 * lawyer review" holding the full text in a scrollable region of at most 260 px. The region can be
 * focused, so it scrolls with the keyboard too (axe "scrollable-region-focusable").
 * Who uses it: LegalDocumentView, once per section. A note without the two parts (the
 * "Proposed additional sections" introduction) is shown as a plain paragraph across the grid.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';

import type { LegalSection } from '../lib/parseLegalDocument';

import { AfterTheTestLabel } from './AfterTheTestLabel';
import { LegalMarkdown } from './LegalMarkdown';

/** What the card needs. */
interface LegalSectionCardProps {
  section: LegalSection;
  /** False while the text is a draft not checked by a lawyer; changes the full-text label. */
  isLawyerReviewed: boolean;
  /** The language of the legal text, which can differ from the interface (WCAG 2.2, 3.1.2). */
  textLanguage: string;
}

/**
 * The "Proposed additional sections" note: a heading and its paragraph across the whole grid.
 *
 * @returns the note
 */
function LegalSectionNote({
  section,
  textLanguage,
}: {
  section: LegalSection;
  textLanguage: string;
}) {
  return (
    <div className="col-span-full flex flex-col gap-2 pt-4">
      <h3 lang={textLanguage} className="m-0 font-heading text-[22px] font-bold text-heading">
        {section.title}
      </h3>
      <LegalMarkdown markdown={section.fullMarkdown} language={textLanguage} />
    </div>
  );
}

/**
 * The full text, in a dashed box that scrolls on its own. The scrolling part can take keyboard
 * focus, so it scrolls with the arrow keys too (axe "scrollable-region-focusable").
 *
 * @returns the box
 */
function LegalFullTextBox({ section, isLawyerReviewed, textLanguage }: LegalSectionCardProps) {
  const { t } = useTranslation('legal');
  return (
    <div className="mt-auto rounded-2xl border border-dashed border-dashed-border bg-paper p-4">
      <p className="m-0 mb-2 text-sm font-semibold text-meta">
        {isLawyerReviewed ? t('fullText') : t('fullTextDraft')}
      </p>
      <div
        role="region"
        tabIndex={0}
        aria-label={t('fullTextRegion', { title: section.title })}
        className="max-h-[260px] overflow-y-auto pr-2 text-[15px]"
      >
        <LegalMarkdown markdown={section.fullMarkdown} language={textLanguage} />
      </div>
    </div>
  );
}

/**
 * Renders one section.
 *
 * @returns an <article> card, or the note for a section without parts
 */
export function LegalSectionCard({
  section,
  isLawyerReviewed,
  textLanguage,
}: LegalSectionCardProps) {
  const { t } = useTranslation('legal');
  const titleId = useId();
  if (section.shortMarkdown === '')
    return <LegalSectionNote section={section} textLanguage={textLanguage} />;

  return (
    <article
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      {/* Number and title. */}
      <div className="flex items-center gap-3">
        {section.number !== null && (
          <span
            aria-hidden="true"
            className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full bg-tint font-heading font-bold text-heading"
          >
            {section.number}
          </span>
        )}
        <h3
          id={titleId}
          lang={textLanguage}
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {section.title}
        </h3>
      </div>
      {/* Labels for the whole section: proposed, and applies only after the invited test. */}
      {(section.isProposed || section.isAfterTheTest) && (
        <div className="flex flex-wrap gap-2">
          {section.isProposed && <InfoPill tone="neutral">{t('proposedSection')}</InfoPill>}
          {section.isAfterTheTest && <AfterTheTestLabel />}
        </div>
      )}
      {/* The short version. */}
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('shortVersion')}</Eyebrow>
        <LegalMarkdown markdown={section.shortMarkdown} language={textLanguage} />
      </div>
      <LegalFullTextBox
        section={section}
        isLawyerReviewed={isLawyerReviewed}
        textLanguage={textLanguage}
      />
    </article>
  );
}
