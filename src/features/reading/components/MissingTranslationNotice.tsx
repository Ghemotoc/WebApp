/**
 * MissingTranslationNotice: what the reader shows for a chapter that isn't in the chosen language
 * yet (bundle TRANSLATE-1b; boards TrMissing and PhoneTrMissing; Robert, 16 Nov 2026).
 *
 * What it shows: the chapter bar (back to the story, "Chapter 5 of 6", Read in), then a card:
 * the eyebrow "Chapter 5 · <title>", the heading "This chapter isn't in English yet", how far
 * the translation goes, "Read chapter 5 in Română" (the main button, to the original), "Back to
 * chapter 4" (the nearest earlier chapter this language has) and the line about notifications:
 * a follower of the story is told when the chapter comes out in this language
 * (notify_chapter_published(), …_translate1_01_story_editions.sql).
 * No doodles (DoD design rules: the chapter reader has none).
 * Who shows it: ChapterReaderPage, when get_chapter() answers `missing_translation`.
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { languageNameIn, languageOwnName } from '@/lib/language-names';

import type { MissingTranslation, ReaderChapter } from '../api/chapter';
import { useEditionsTranslation } from '../registerEditionsTranslations';

import { ChapterBar } from './ChapterBar';
import { BackIcon } from './ReaderIcons';

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

/** The two buttons: the original now, or back to the last chapter this language has. */
function MissingActions({ chapter, missing }: MissingTranslationNoticeProps) {
  const { t } = useEditionsTranslation();
  const original = languageOwnName(missing.original.languageCode);
  return (
    <div className="flex flex-wrap gap-2.5">
      <Link
        to={`/s/${missing.original.slug}/${missing.original.code}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full button-main px-5 py-2 text-[15px] font-semibold no-underline"
      >
        <ActionIcon name="book" size={18} className="flex-none" />
        {t('missing.readOriginal', { number: chapter.number, original })}
      </Link>
      {chapter.previousCode !== null && missing.previousNumber !== null && (
        <Link
          to={`/s/${chapter.story.slug}/${chapter.previousCode}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full button-glass py-2 pr-[18px] pl-3 text-[15px] font-semibold no-underline"
        >
          <BackIcon />
          {t('missing.back', { number: missing.previousNumber })}
        </Link>
      )}
    </div>
  );
}

/**
 * Renders the notice.
 *
 * @returns the bar and the card
 */
export function MissingTranslationNotice({ chapter, missing }: MissingTranslationNoticeProps) {
  const { t, i18n } = useEditionsTranslation();
  const progressSentence = useProgressSentence({ chapter, missing });
  // The language as a word inside the sentence ("in English", "în engleză").
  const language = languageNameIn(chapter.story.languageCode, i18n.language);
  const original = languageOwnName(missing.original.languageCode);
  const title = t('missing.title', { language });
  return (
    <>
      <title>{t('missing.documentTitle', { title, story: chapter.story.title })}</title>
      <ChapterBar chapter={chapter} minutesLeft={null} settings={null} />
      <section
        aria-labelledby="missing-translation-title"
        className="mx-auto mt-6 flex w-full max-w-[880px] flex-col items-start gap-3.5 rounded-card border border-border bg-surface px-6 py-8 shadow-card sm:px-9"
      >
        <Eyebrow>
          <span lang={missing.original.languageCode}>
            {t('missing.eyebrow', {
              number: chapter.number,
              title: missing.original.title,
            })}
          </span>
        </Eyebrow>
        <h1
          id="missing-translation-title"
          className="m-0 font-heading text-[clamp(26px,3.2vw,36px)] leading-tight font-bold break-words text-heading"
        >
          {title}
        </h1>
        <p className="m-0 max-w-[640px] text-base leading-[1.6] text-body">
          {progressSentence !== '' && `${progressSentence} `}
          {t('missing.body', { number: chapter.number, original, language })}
        </p>
        <MissingActions chapter={chapter} missing={missing} />
        <p className="m-0 text-sm text-meta">
          {t('missing.follow', { number: chapter.number, language })}
        </p>
      </section>
    </>
  );
}
