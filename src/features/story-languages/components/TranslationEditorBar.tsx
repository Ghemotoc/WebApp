/**
 * TranslationEditorBar: the bar above the side-by-side translation editor (bundle TRANSLATE-1c;
 * board TrEditor).
 *
 * What it shows: a back link with the story's title in this language (to the language's chapter
 * list), "Chapter 1 · Fifteen" (the original chapter's title), "Save draft" and "Publish in
 * <language>" ("Publish changes" once the chapter is live). On phones the two buttons are hidden:
 * a phone doesn't translate (CALM-9, board D09).
 * Who shows it: TranslationEditorPage. It only draws; the page's hook does the saving.
 */
import { Link } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Button } from '@/components/ui/Button';

import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the bar needs. */
export interface TranslationEditorBarProps {
  /** The edition being translated into: its address, title and language. */
  edition: { slug: string; title: string; languageCode: string; languageName: string };
  /** "Chapter 1 · Fifteen", already put together. */
  place: string;
  isPublished: boolean;
  isBusy: boolean;
  onSave: () => void;
  onPublish: () => void;
}

/**
 * Renders the bar.
 *
 * @returns the bar
 */
export function TranslationEditorBar(props: TranslationEditorBarProps) {
  const { edition, place, isPublished, isBusy, onSave, onPublish } = props;
  const { t } = useStoryLanguagesTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border bg-surface px-4 py-3 shadow-card">
      <Link
        to={`/write/s/${edition.slug}/translate`}
        lang={edition.languageCode}
        className="inline-flex min-h-11 min-w-0 flex-[1_1_160px] items-center gap-2 type-body font-semibold break-words text-ink-heading no-underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="shrink-0" />
        {edition.title}
      </Link>
      {/* The page's heading: small, as on the board, but still the h1 a screen reader lands on. */}
      <h1 className="m-0 flex-[1_1_160px] font-body type-body font-normal tracking-normal text-ink-muted md:text-center">
        {place}
      </h1>
      <div className="flex flex-[1_1_auto] flex-wrap justify-end gap-2 max-md:hidden">
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
  );
}
