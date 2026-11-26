/**
 * EditorBar: the chapter editor's own bar (board D05, user story 5.5; design system FocusBar,
 * the same glass bar as the reader's ChapterBar).
 *
 * From 1024 px it sits under the website's top bar: Back to chapters (a round button), the
 * story's title with "Chapter 16 · Saved · 240 words" under it, centred, then Focus mode, Compare
 * versions (only after the chapter changed on another device, S1-E3-02b), Preview and Publish,
 * the page's one main button. Below 1024 px it is header A and the only bar on the screen (no
 * tab bar, usePageOwnsNarrowHeader): Back, "Chapter 16" with "Saved · 240 words", and Publish.
 * Both bars stay at the top while the writer scrolls (sticky, like the reader's).
 * Who uses it: ChapterEditorPage. What it calls: SaveWord; the buttons call back to the page.
 */
import { Link } from 'react-router';

import { usePageOwnsNarrowHeader } from '@/app/shell/pageHeaderContext';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { BackArrowIcon } from '@/features/reading/components/ReaderIcons';

import type { SaveState } from '../hooks/useAutosave';
import { useEditorTranslation } from '../registerEditorTranslations';

import { SaveWord } from './SaveWord';

/** What the bar needs. */
export interface EditorBarProps {
  storySlug: string;
  storyTitle: string;
  /** The story's language, so a screen reader says its title right (WCAG 3.1.2). */
  storyLanguage: string;
  chapterNumber: number;
  wordCount: number;
  saveState: SaveState;
  isFocusMode: boolean;
  onFocusModeChange: (isOn: boolean) => void;
  /** True after a conflict: Compare versions shows. */
  canCompare: boolean;
  onCompare: () => void;
  onPreview: () => void;
  onPublish: () => void;
}

/** The round 44 px quiet icon button's classes, as the reader's bar. */
const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-heading no-underline hover:bg-tint';

/** The bar's frame: the glass bar, sticky under the top bar (or at the top on phones). */
const barClasses = 'tmc-chapter-bar glass-float sticky z-20 items-center gap-2 rounded-full p-2';

/**
 * The meta line's parts after "Chapter 16": the save words and the word count, joined by dots.
 *
 * @returns the line, as elements, so the save words keep their colour
 */
function SaveAndWords({ saveState, wordCount }: { saveState: SaveState; wordCount: number }) {
  const { t } = useEditorTranslation();
  const hasSaveWord = saveState.kind !== 'idle';
  return (
    <>
      {hasSaveWord && <SaveWord state={saveState} />}
      {hasSaveWord && ' · '}
      {t('wordCount', { count: wordCount })}
    </>
  );
}

/** Back to the story's chapters (board D05: "Back to chapters"). */
function BackToChapters({ storySlug }: { storySlug: string }) {
  const { t } = useEditorTranslation();
  return (
    <Link to={`/write/s/${storySlug}/chapters`} aria-label={t('bar.back')} className={iconButton}>
      <BackArrowIcon />
    </Link>
  );
}

/** The bar from 1024 px. */
function WideBar(props: EditorBarProps) {
  const { t } = useEditorTranslation();
  return (
    <nav aria-label={t('bar.label')} className={`${barClasses} hidden lg:flex`}>
      <BackToChapters storySlug={props.storySlug} />
      <p className="m-0 max-w-none min-w-0 flex-1 text-center type-body leading-5 font-semibold text-ink-heading">
        <span lang={props.storyLanguage} className="block truncate">
          {props.storyTitle}
        </span>
        <span className="block truncate type-meta font-normal text-ink-muted">
          {t('chapterNumber', { number: props.chapterNumber })}
          {' · '}
          <SaveAndWords saveState={props.saveState} wordCount={props.wordCount} />
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={props.isFocusMode}
          onClick={() => props.onFocusModeChange(!props.isFocusMode)}
          className={buttonClassName({ variant: 'text' }, 'mx-2')}
        >
          {t('bar.focusMode')}
        </button>
        {props.canCompare && (
          <button
            type="button"
            onClick={props.onCompare}
            className={buttonClassName({ variant: 'text' }, 'mx-2')}
          >
            {t('conflict.compare')}
          </button>
        )}
        <button
          type="button"
          onClick={props.onPreview}
          className={buttonClassName({ variant: 'secondary' })}
        >
          {t('bar.preview')}
        </button>
        <button type="button" onClick={props.onPublish} className={buttonClassName()}>
          {t('bar.publish')}
        </button>
      </div>
    </nav>
  );
}

/** Header A, below 1024 px: Back, the chapter with its save and words, and Publish. */
function NarrowBar(props: EditorBarProps) {
  const { t } = useEditorTranslation();
  return (
    <nav aria-label={t('bar.label')} className={`${barClasses} flex lg:hidden`}>
      <BackToChapters storySlug={props.storySlug} />
      <p className="m-0 max-w-none min-w-0 flex-1 text-center type-body leading-5 font-semibold text-ink-heading">
        <span className="block truncate">
          {t('chapterNumber', { number: props.chapterNumber })}
        </span>
        <span className="block truncate type-meta font-normal text-ink-muted">
          <SaveAndWords saveState={props.saveState} wordCount={props.wordCount} />
        </span>
      </p>
      <button
        type="button"
        onClick={props.onPublish}
        className={buttonClassName({}, 'h-10 shrink-0')}
      >
        {t('bar.publish')}
      </button>
    </nav>
  );
}

/**
 * Renders the bar: the wide one from 1024 px, header A below.
 *
 * @returns both bars; CSS shows the one for the screen's width
 */
export function EditorBar(props: EditorBarProps) {
  // Below 1024 px this is the only bar on the screen (board D05: "header A only").
  usePageOwnsNarrowHeader();
  return (
    <>
      <WideBar {...props} />
      <NarrowBar {...props} />
    </>
  );
}
