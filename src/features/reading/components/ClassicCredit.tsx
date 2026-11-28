/**
 * ClassicCredit: the lines under a classic's author on the story page that say who translated it,
 * where its text came from and under which licence (S1-E11-16; bundle CLASSIC-CREDIT, Robert,
 * 28 Nov 2026, 05:30 and 05:37 UTC: "just the license and the source (hyperlinked)").
 *
 * Text only, inside the "About this story" author card. The source edition and the licence are
 * both links; a classic added before the staff form saved a source says "Source to be added".
 * Who uses it: StorySideColumn's ClassicAuthorCard.
 * What it calls: classicSourceLicence (the licence from the source link's host).
 */
import { useTranslation } from 'react-i18next';

import type { ClassicAuthor } from '../api/storyPage';
import { classicSourceLicence } from '../lib/classicCredit';

/** The shared look of every line in the credit. */
const LINE_CLASS = 'm-0 type-body leading-normal text-ink-muted';

/** Source and licence links open in a new tab and pass nothing on (CLAUDE.md rule 8). */
const LINK_CLASS = 'font-semibold underline underline-offset-2';

/**
 * The translator, when the text is a translation (S1-E11-16).
 *
 * @returns the line, or nothing for a text in its own language
 */
function TranslatorLine({ author }: { author: ClassicAuthor }) {
  const { t } = useTranslation('reading');
  if (author.translatorName === null) return null;
  return (
    <p className={LINE_CLASS}>
      {t('storyPage.classicTranslator', { name: author.translatorName })}
    </p>
  );
}

/**
 * The licence the source publishes its texts under, as a link to the licence where it has one.
 *
 * @returns the line, or nothing for a source not on the list
 */
function LicenceLine({ sourceUrl }: { sourceUrl: string | null }) {
  const { t } = useTranslation('reading');
  const licence = classicSourceLicence(sourceUrl);
  if (licence === null) return null;
  const name = t(`classicCredit.licence.${licence.kind}`);
  return (
    <p className={LINE_CLASS}>
      {t('classicCredit.licenceLabel')}{' '}
      {licence.url === null ? (
        name
      ) : (
        <a href={licence.url} rel="nofollow ugc noopener" target="_blank" className={LINK_CLASS}>
          {name}
        </a>
      )}
    </p>
  );
}

/**
 * Where the text came from: the source edition as a link, or "Source to be added" for a classic
 * added before the staff form saved one (S1-E11-16 AC 5).
 *
 * @returns the line
 */
function SourceLine({ author }: { author: ClassicAuthor }) {
  const { t } = useTranslation('reading');
  if (author.sourceTitle === null || author.sourceUrl === null) {
    return <p className={LINE_CLASS}>{t('classicCredit.sourceMissing')}</p>;
  }
  return (
    <p className={LINE_CLASS}>
      {t('storyPage.classicSource')}{' '}
      <a href={author.sourceUrl} rel="nofollow ugc noopener" target="_blank" className={LINK_CLASS}>
        {author.sourceTitle}
      </a>
    </p>
  );
}

/**
 * Renders the credit lines in reading order: the translator, the source and its licence.
 *
 * @param author - the classic's author and source facts from get_story_page()
 * @returns the lines
 */
export function ClassicCredit({ author }: { author: ClassicAuthor }) {
  return (
    <>
      <TranslatorLine author={author} />
      <SourceLine author={author} />
      <LicenceLine sourceUrl={author.sourceUrl} />
    </>
  );
}
