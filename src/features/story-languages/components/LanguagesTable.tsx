/**
 * LanguagesTable: the languages of one story, the original first (bundle TRANSLATE-1c; board
 * TrSettings; Robert, 16 Nov 2026).
 *
 * What it shows, per language, in board D08's columns (CALM-9, user story 5.8): its own name (with
 * "Original" under the first edition), the title in that language, how many of the story's
 * chapters are published in it, Published or Draft, and one action: "Open" leads to the
 * original's chapters, "Translate" to that language's chapter list. There is no "Translated by":
 * only the writer translates their own story, and that credit shows on classics only (Robert,
 * 16 Nov 2026).
 * It is a plain table on the page, not a card, from 768 px; on a phone each language is a small
 * block with the same facts under their labels, so nothing scrolls sideways (CLAUDE.md rule 21).
 * Who shows it: StoryLanguagesPage. Plain rows with a 1 px line between them (DoD design rules).
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { languageOwnName } from '@/lib/language-names';
import { cn } from '@/lib/utils';

import type { StoryLanguage } from '../api/storyLanguages';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** A cell: a table cell from 768 px, a labelled line on a phone. */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <td className="px-3 py-1 align-top type-body text-ink max-md:block max-md:px-0 md:py-3">
      <span className="mr-2 type-meta font-semibold text-ink-muted md:hidden">{label}</span>
      {children}
    </td>
  );
}

/** "Open" for the original, "Translate" for a translation. */
function LanguageAction({ language }: { language: StoryLanguage }) {
  const { t } = useStoryLanguagesTranslation();
  const name = languageOwnName(language.languageCode);
  const look = buttonClassName({ variant: 'secondary', size: 'md' });
  if (language.isFirstEdition) {
    return (
      <Link
        to={`/write/s/${language.slug}/chapters`}
        aria-label={t('table.openLabel', { title: language.title })}
        className={look}
      >
        {t('table.open')}
      </Link>
    );
  }
  // CALM-9, board D08: translating needs the original and the translation side by side, so on a
  // phone the button becomes a line saying where it works (the editor says the same, D09).
  return (
    <>
      <span className="type-meta leading-[18px] text-ink-muted sm:hidden">
        {t('table.translateOnBiggerScreen')}
      </span>
      <Link
        to={`/write/s/${language.slug}/translate`}
        aria-label={t('table.translateLabel', { language: name })}
        className={cn(look, 'max-sm:hidden')}
      >
        {t('table.translate')}
      </Link>
    </>
  );
}

/** One language's row. */
function LanguageRow({ language }: { language: StoryLanguage }) {
  const { t } = useStoryLanguagesTranslation();
  return (
    <tr className="border-b border-border max-md:flex max-md:flex-col max-md:gap-1 max-md:py-4">
      <th
        scope="row"
        className="px-3 py-1 text-left align-top type-label font-semibold text-ink-heading max-md:px-0 md:py-3"
      >
        <span className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-0">
          <span lang={language.languageCode}>{languageOwnName(language.languageCode)}</span>
          {/* CALM-9c: "Original" is a quiet word under the language, not a pill. */}
          {language.isFirstEdition && (
            <span className="type-meta font-normal text-ink-muted">{t('table.original')}</span>
          )}
        </span>
      </th>
      <Cell label={t('table.title')}>
        <span lang={language.languageCode} className="break-words">
          {language.title}
        </span>
      </Cell>
      <Cell label={t('table.chapters')}>
        {t('table.chaptersOf', {
          count: language.chaptersPublished,
          total: language.chaptersInStory,
        })}
      </Cell>
      <Cell label={t('table.status')}>
        {/* CALM-9c: the state is a bold word, as a meta line's state. */}
        <span className="font-semibold text-ink">
          {language.isPublic ? t('table.published') : t('table.draft')}
        </span>
      </Cell>
      <td className="px-3 py-1 align-top max-md:px-0 max-md:pt-2 md:py-2">
        <LanguageAction language={language} />
      </td>
    </tr>
  );
}

/**
 * Renders the table.
 *
 * @returns the table with one row per language
 */
export function LanguagesTable({ languages }: { languages: StoryLanguage[] }) {
  const { t } = useStoryLanguagesTranslation();
  const headings = ['language', 'title', 'chapters', 'status'] as const;
  return (
    <div>
      <table className="w-full border-collapse max-md:block">
        <caption className="sr-only">{t('table.caption')}</caption>
        <thead className="max-md:sr-only">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="border-b border-border px-3 py-3 text-left type-meta font-semibold text-ink-muted"
              >
                {t(`table.${heading}`)}
              </th>
            ))}
            <th scope="col" className="border-b border-border px-3 py-3">
              <span className="sr-only">{t('table.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="max-md:block">
          {languages.map((language) => (
            <LanguageRow key={language.slug} language={language} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
