/**
 * LegalSectionCard: one numbered section of a legal document (story S1-E14-01; board J08 of the
 * user stories, bundle 10).
 *
 * Board values (J08-Legal): the heading "1. Who we are", the short version in a tinted box with the
 * label "In short", then the full text folded under a fine line ("Full text · draft for lawyer
 * review"), opened with a click or the keyboard (a real <details>, so it needs no script and a
 * screen reader says whether it is open). The summary row is 44 px tall (CLAUDE.md rule 9).
 * Each numbered section has the address part #section-<number>, so a link can open one section,
 * for example Discover's "How ranking works" (/legal/terms#section-5, S1-E5-03; DSA art. 27). The
 * text arrives after the page, so the section scrolls itself into view and opens its full text
 * when the address names it.
 * Who uses it: LegalDocumentView, once per section. A note without the two parts (the
 * "Proposed additional sections" introduction) is shown as a plain heading and paragraph.
 */
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { StateWord } from '@/components/ui/StateWord';

import type { LegalSection } from '../lib/parseLegalDocument';

import { AfterTheTestLabel } from './AfterTheTestLabel';
import { LegalMarkdown } from './LegalMarkdown';

/** What the section needs. */
interface LegalSectionCardProps {
  section: LegalSection;
  /** False while the text is a draft not checked by a lawyer; changes the full-text label. */
  isLawyerReviewed: boolean;
  /** The language of the legal text, which can differ from the interface (WCAG 2.2, 3.1.2). */
  textLanguage: string;
}

/**
 * The "Proposed additional sections" note: a heading and its paragraph.
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
    <div className="flex flex-col gap-2">
      <h3 lang={textLanguage} className="m-0 font-heading type-heading font-bold text-ink-heading">
        {section.title}
      </h3>
      <LegalMarkdown markdown={section.fullMarkdown} language={textLanguage} />
    </div>
  );
}

/**
 * The short version in the board's tinted box, under the label "In short".
 *
 * @returns the box
 */
function LegalShortBox({ section, textLanguage }: Omit<LegalSectionCardProps, 'isLawyerReviewed'>) {
  const { t } = useTranslation('legal');
  return (
    <div className="flex flex-col gap-1 rounded-field bg-tint p-4">
      <p className="m-0 type-label font-semibold text-ink-heading">{t('shortVersion')}</p>
      <LegalMarkdown markdown={section.shortMarkdown} language={textLanguage} />
    </div>
  );
}

/**
 * The labels for a whole section: proposed, and applies only after the invited test.
 *
 * @returns the row of labels, or nothing when the section has neither
 */
function LegalSectionLabels({ section }: { section: LegalSection }) {
  const { t } = useTranslation('legal');
  if (!section.isProposed && !section.isAfterTheTest) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {section.isProposed && <StateWord>{t('proposedSection')}</StateWord>}
      {section.isAfterTheTest && <AfterTheTestLabel />}
    </div>
  );
}

/**
 * Scrolls a section into view, and says it should open, when the address's #part names it
 * (S1-E5-03).
 *
 * @param anchor - the section's id, for example "section-5", or null for an unnumbered section
 * @returns the ref to put on the section and whether the address names it
 */
function useScrollWhenNamed(anchor: string | null) {
  const sectionRef = useRef<HTMLElement>(null);
  const { hash } = useLocation();
  const isNamed = anchor !== null && hash === `#${anchor}`;
  useEffect(() => {
    // The browser looks for the id before the text has loaded, so the section does it once it exists.
    if (isNamed) sectionRef.current?.scrollIntoView();
  }, [isNamed]);
  return { sectionRef, isNamed };
}

/**
 * The heading's words: "1. Who we are" as on the board, or the title alone without a number.
 *
 * @returns the heading text
 */
function numberedTitle(section: LegalSection): string {
  if (section.number === null) return section.title;
  return `${section.number}. ${section.title}`;
}

/**
 * Renders one section.
 *
 * @returns a <section> with its heading, short version and folded full text, or the note
 */
export function LegalSectionCard({
  section,
  isLawyerReviewed,
  textLanguage,
}: LegalSectionCardProps) {
  const { t } = useTranslation('legal');
  const titleId = useId();
  const anchor = section.number === null ? null : `section-${section.number}`;
  const { sectionRef, isNamed } = useScrollWhenNamed(anchor);
  if (section.shortMarkdown === '')
    return <LegalSectionNote section={section} textLanguage={textLanguage} />;

  return (
    <section
      ref={sectionRef}
      id={anchor ?? undefined}
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-3"
    >
      {/* Step 1: the numbered heading, as on the board ("1. Who we are"). */}
      <h3
        id={titleId}
        lang={textLanguage}
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {numberedTitle(section)}
      </h3>
      {/* Step 2: labels for the whole section. */}
      <LegalSectionLabels section={section} />
      {/* Step 3: the short version, then the full text folded under a fine line. */}
      <LegalShortBox section={section} textLanguage={textLanguage} />
      <details open={isNamed || undefined} className="border-t border-hairline pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center type-body font-semibold text-ink-heading">
          {isLawyerReviewed ? t('fullText') : t('fullTextDraft')}
        </summary>
        <div className="pt-2 pb-4">
          <LegalMarkdown markdown={section.fullMarkdown} language={textLanguage} />
        </div>
      </details>
    </section>
  );
}
