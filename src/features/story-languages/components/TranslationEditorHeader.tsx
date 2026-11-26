/**
 * TranslationEditorHeader: the top of the side-by-side translation editor (bundle TRANSLATE-1c),
 * as board D09 draws it (CALM-9, user story 5.9).
 *
 * What it shows: the breadcrumb "Writing / <the story in this language> / Chapter 1", where the
 * story's title leads back to the language's chapter list; "Chapter 1 · Fifteen" as the page's
 * heading with the facts line under it (the story in this language · the language · "41 of 64
 * words so far"); and, on the right, "Save draft" and "Publish in <language>" ("Publish changes"
 * once the chapter is live). On phones the two buttons are hidden: a phone doesn't translate
 * (CALM-9, board D09).
 * Who shows it: TranslationEditorPage. It only draws; the page's hook does the saving.
 */
import { Button } from '@/components/ui/Button';
import { MetaLine } from '@/components/ui/MetaLine';
import { WritingBreadcrumb } from '@/features/writing/components/WritingBreadcrumb';
import { useTranslation } from 'react-i18next';

import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the header needs. */
export interface TranslationEditorHeaderProps {
  /** The edition being translated into: its address, title and language. */
  edition: { slug: string; title: string; languageCode: string; languageName: string };
  /** The chapter's number, for the breadcrumb's last step. */
  chapterNumber: number;
  /** "Chapter 1 · Fifteen", already put together. */
  place: string;
  /** The words translated so far and the original's words, for the facts line. */
  words: { translated: number; original: number };
  isPublished: boolean;
  isBusy: boolean;
  onSave: () => void;
  onPublish: () => void;
}

/**
 * Renders the header.
 *
 * @returns the breadcrumb, the heading with its facts line, and the two buttons
 */
export function TranslationEditorHeader(props: TranslationEditorHeaderProps) {
  const { edition, chapterNumber, place, words, isPublished, isBusy, onSave, onPublish } = props;
  const { t } = useStoryLanguagesTranslation();
  const { t: writingT } = useTranslation('writing');
  // Writing, then the story in this language (its chapter list), then this chapter.
  const crumbs = [
    { label: writingT('breadcrumb.writing'), to: '/write' },
    { label: edition.title, to: `/write/s/${edition.slug}/translate`, lang: edition.languageCode },
    { label: t('chapters.chapterNumber', { number: chapterNumber }) },
  ];
  return (
    <div className="flex flex-col gap-3">
      <WritingBreadcrumb crumbs={crumbs} />
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 type-title break-words">{place}</h1>
          <MetaLine
            facts={[
              { text: edition.title },
              { text: edition.languageName },
              { text: t('editor.progress', { count: words.translated, total: words.original }) },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-3 max-md:hidden">
          <Button type="button" variant="secondary" disabled={isBusy} onClick={onSave}>
            {t('editor.saveDraft')}
          </Button>
          <Button type="button" disabled={isBusy} onClick={onPublish}>
            {isPublished
              ? t('editor.publishChanges')
              : t('editor.publish', { language: edition.languageName })}
          </Button>
        </div>
      </div>
    </div>
  );
}
