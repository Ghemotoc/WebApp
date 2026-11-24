/**
 * MissingTranslationNotice: what the reader shows for a chapter that isn't in the chosen language
 * yet (bundle TRANSLATE-1b, Robert, 16 Nov 2026; redrawn to board B08-ReaderMissing, BOOKS B08,
 * user story 2.8).
 *
 * What it shows, in place of the paper and flat on the page as on board B08 (no chapter bar and no
 * card): a meta line "Chapter 5 · <title>", the heading "This chapter isn't in English yet", how
 * far the translation goes, "Read chapter 5 in Română" (the main button, to the original), "Back
 * to chapter 4" (the nearest earlier chapter this language has) and the line about notifications:
 * a follower of the story is told when the chapter comes out in this language
 * (notify_chapter_published(), …_translate1_01_story_editions.sql).
 * The reader's language choice stays as it is: neither button saves a language, so the next
 * chapter opens in the chosen language once it is translated (user story 2.8, criterion 3; only
 * ReadInSwitch saves the remembered edition).
 * Who shows it: ChapterReaderPage, when get_chapter() answers `missing_translation`.
 */
import { Link } from 'react-router';

import { languageNameIn, languageOwnName } from '@/lib/language-names';

import type { MissingTranslation, ReaderChapter } from '../api/chapter';
import { useEditionsTranslation } from '../registerEditionsTranslations';

/** What the notice needs. */
export interface MissingTranslationNoticeProps {
  /** The answer as a chapter with no text: the story, the number and the editions. */
  chapter: ReaderChapter;
  /** What is known about the missing translation. */
  missing: MissingTranslation;
}

/**
 * How far the translation goes: "Ana Vlad has translated chapters 1 to 4." Nothing when chapter
 * one itself is missing.
 *
 * @returns the sentence, or an empty string
 */
function useProgressSentence({ chapter, missing }: MissingTranslationNoticeProps): string {
  const { t } = useEditionsTranslation();
  // A classic names its translator; a member's story is translated by its writer.
  const translator = missing.translatorName ?? chapter.story.writer.displayName;
  if (missing.translatedThrough <= 0) return '';
  if (missing.translatedThrough === 1) return t('missing.translatedFirst', { translator });
  return t('missing.translatedThrough', {
    translator,
    through: missing.translatedThrough,
  });
}

/**
 * The two buttons as on board B08, words only: the original now (the one main button), or back
 * to the last chapter this language has (the quiet button).
 */
function MissingActions({ chapter, missing }: MissingTranslationNoticeProps) {
  const { t } = useEditionsTranslation();
  const original = languageOwnName(missing.original.languageCode);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        to={`/s/${missing.original.slug}/${missing.original.code}`}
        className="inline-flex min-h-11 items-center rounded-full button-main px-6 py-2 type-label no-underline"
      >
        {t('missing.readOriginal', { number: chapter.number, original })}
      </Link>
      {chapter.previousCode !== null && missing.previousNumber !== null && (
        <Link
          to={`/s/${chapter.story.slug}/${chapter.previousCode}`}
          className="inline-flex min-h-11 items-center rounded-full button-glass px-6 py-2 type-label no-underline"
        >
          {t('missing.back', { number: missing.previousNumber })}
        </Link>
      )}
    </div>
  );
}

/**
 * Renders the notice.
 *
 * @returns the meta line, the heading, the sentence, the buttons and the notification line
 */
export function MissingTranslationNotice({ chapter, missing }: MissingTranslationNoticeProps) {
  const { t, i18n } = useEditionsTranslation();
  const progressSentence = useProgressSentence({ chapter, missing });
  // The language as a word inside the sentence ("in English", "în engleză").
  const language = languageNameIn(chapter.story.languageCode, i18n.language);
  const original = languageOwnName(missing.original.languageCode);
  const title = t('missing.title', { language });
  return (
    <section
      aria-labelledby="missing-translation-title"
      className="flex w-full flex-col items-start gap-4 pt-3 lg:pt-6"
    >
      <title>{t('missing.documentTitle', { title, story: chapter.story.title })}</title>
      {/* The meta line as MetaLine draws it; the chapter's title is in the original's language,
          so its item says so for screen readers. */}
      <ul className="meta-line">
        <li>{t('missing.chapter', { number: chapter.number })}</li>
        <li lang={missing.original.languageCode}>{missing.original.title}</li>
      </ul>
      <h1 id="missing-translation-title" className="m-0 type-title break-words lg:type-display">
        {title}
      </h1>
      <p className="m-0 type-body text-ink">
        {progressSentence !== '' && `${progressSentence} `}
        {t('missing.body', { number: chapter.number, original, language })}
      </p>
      <MissingActions chapter={chapter} missing={missing} />
      <p className="m-0 type-meta">{t('missing.follow', { number: chapter.number, language })}</p>
    </section>
  );
}
