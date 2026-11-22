/**
 * LanguagesTable: the languages of one story, the original first (bundle TRANSLATE-1c; board
 * TrSettings; Robert, 16 Nov 2026).
 *
 * What it shows, per language: its own name (with "Original" on the first edition), the title in
 * that language, who translated it ("You": only the writer translates their story), how many of
 * the story's chapters are published in it, Published or Draft, and one action: "Open" leads to
 * the original's chapters, "Translate" to that language's chapter list.
 * It is a real table from 768 px; on a phone each language is a small block with the same facts
 * under their labels, so nothing scrolls sideways (CLAUDE.md rule 21).
 * Who shows it: StoryLanguagesPage. Plain rows with a 1 px line between them (DoD design rules).
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { languageOwnName } from '@/lib/language-names';

import type { StoryLanguage } from '../api/storyLanguages';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** A cell: a table cell from 768 px, a labelled line on a phone. */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <td className="px-3 py-1 align-middle text-sm text-body max-md:block max-md:px-0 md:py-4">
      <span className="mr-2 text-[13px] font-semibold text-meta md:hidden">{label}</span>
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
  return (
    <Link
      to={`/write/s/${language.slug}/translate`}
      aria-label={t('table.translateLabel', { language: name })}
      className={look}
    >
      {t('table.translate')}
    </Link>
  );
}

/** One language's row. */
function LanguageRow({ language }: { language: StoryLanguage }) {
  const { t } = useStoryLanguagesTranslation();
  return (
    <tr className="border-t border-border max-md:flex max-md:flex-col max-md:gap-0.5 max-md:py-4">
      <th
        scope="row"
        className="px-3 py-1 text-left align-middle text-sm font-bold text-heading max-md:px-0 md:py-4"
      >
        <span className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-1">
          <span lang={language.languageCode}>{languageOwnName(language.languageCode)}</span>
          {/* CALM-9c: "Original" is a quiet word under the language, not a pill. */}
          {language.isFirstEdition && (
            <span className="text-[13px] font-normal text-meta">{t('table.original')}</span>
          )}
        </span>
      </th>
      <Cell label={t('table.title')}>
        <span lang={language.languageCode} className="break-words">
          {language.title}
        </span>
      </Cell>
      <Cell label={t('table.translatedBy')}>
        {language.isFirstEdition ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">{t('table.nobody')}</span>
          </>
        ) : (
          t('table.you')
        )}
      </Cell>
      <Cell label={t('table.chapters')}>
        {t('table.chaptersOf', {
          count: language.chaptersPublished,
          total: language.chaptersInStory,
        })}
      </Cell>
      <Cell label={t('table.status')}>
        {/* CALM-9c: the state is a bold word, as a meta line's state. */}
        <span className="font-bold text-ink">
          {language.isPublic ? t('table.published') : t('table.draft')}
        </span>
      </Cell>
      <td className="px-3 py-1 align-middle max-md:px-0 max-md:pt-2 md:py-4">
        <LanguageAction language={language} />
      </td>
    </tr>
  );
}

/**
 * Renders the table.
 *
 * @returns the card with one row per language
 */
export function LanguagesTable({ languages }: { languages: StoryLanguage[] }) {
  const { t } = useStoryLanguagesTranslation();
  const headings = ['language', 'title', 'translatedBy', 'chapters', 'status'] as const;
  return (
    <section className="rounded-card border border-border bg-surface px-5 py-2 shadow-card md:px-2.5">
      <table className="w-full border-collapse max-md:block">
        <caption className="sr-only">{t('table.caption')}</caption>
        <thead className="max-md:sr-only">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-3 py-4 text-left eyebrow-type text-heading"
              >
                {t(`table.${heading}`)}
              </th>
            ))}
            <th scope="col" className="px-3 py-4">
              <span className="sr-only">{t('table.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="max-md:block [&>tr:first-child]:max-md:border-t-0">
          {languages.map((language) => (
            <LanguageRow key={language.slug} language={language} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
