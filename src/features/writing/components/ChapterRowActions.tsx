/**
 * ChapterRowActions: the buttons at the end of each row on Manage chapters (story S1-E3-04;
 * board 4.4): move up and down, Edit, Rename, Unpublish or Publish again, and Delete.
 *
 * Board values: 44 px round arrow buttons (a #8E7B99 border when they work, pale at the ends),
 * a thin divider, then text buttons in the link colour and Delete in red.
 * The arrows at the ends use aria-disabled, not disabled, so a keyboard user who just moved a
 * chapter to the top keeps focus on the button instead of losing it to the page.
 * Who uses it: ManagedChapterRow. What it calls: nothing itself; the row passes the changes up
 * to useManageChapters.
 */
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';

import { ChevronDownIcon, ChevronUpIcon } from './ManageChaptersIcons';

/** What the actions need. */
export interface ChapterRowActionsProps {
  slug: string;
  chapter: ManagedChapter;
  /** The chapter's place in the reading order, from 1. */
  number: number;
  isLast: boolean;
  isBusy: boolean;
  renameButtonRef: RefObject<HTMLButtonElement | null>;
  onChange: (change: ChapterChange) => void;
  onStartRename: () => void;
  onAskDelete: () => void;
}

/** The classes shared by the text buttons. */
const textButton =
  'inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-link hover:underline';

/** One round arrow button; pale and inactive at the end of the list. */
function ArrowButton(props: {
  label: string;
  isOff: boolean;
  onMove: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-disabled={props.isOff}
      onClick={() => {
        if (!props.isOff) props.onMove();
      }}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-full border',
        props.isOff
          ? 'cursor-not-allowed border-border bg-panel text-meta opacity-60'
          : 'border-control-border bg-surface text-heading hover:bg-tint',
      )}
    >
      {props.children}
    </button>
  );
}

/** Unpublish for a published chapter, Publish again for an unpublished one, else nothing. */
function PublishToggle({
  chapter,
  isBusy,
  onChange,
}: Pick<ChapterRowActionsProps, 'chapter' | 'isBusy' | 'onChange'>) {
  const { t } = useTranslation('writing');
  if (chapter.state === 'published') {
    return (
      <button
        type="button"
        className={textButton}
        disabled={isBusy}
        onClick={() => onChange({ kind: 'unpublish', code: chapter.code })}
      >
        {t('manageChapters.unpublish')}
      </button>
    );
  }
  if (chapter.state !== 'unpublished') return null;
  return (
    <button
      type="button"
      className={textButton}
      disabled={isBusy}
      onClick={() => onChange({ kind: 'publish', code: chapter.code })}
    >
      {t('manageChapters.publishAgain')}
    </button>
  );
}

/**
 * Renders the actions.
 *
 * @returns the arrows, the divider and the text buttons
 */
export function ChapterRowActions({ renameButtonRef, ...props }: ChapterRowActionsProps) {
  const { t } = useTranslation('writing');
  const { chapter, number } = props;
  return (
    <div className="flex flex-[0_1_auto] flex-wrap items-center gap-1">
      <ArrowButton
        label={t('manageChapters.moveUp', { number })}
        isOff={number === 1 || props.isBusy}
        onMove={() => props.onChange({ kind: 'move', code: chapter.code, direction: -1 })}
      >
        <ChevronUpIcon />
      </ArrowButton>
      <ArrowButton
        label={t('manageChapters.moveDown', { number })}
        isOff={props.isLast || props.isBusy}
        onMove={() => props.onChange({ kind: 'move', code: chapter.code, direction: 1 })}
      >
        <ChevronDownIcon />
      </ArrowButton>
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
      <Link to={`/write/s/${props.slug}/c/${chapter.code}`} className={textButton}>
        {t('manageChapters.edit')}
      </Link>
      <button
        ref={renameButtonRef}
        type="button"
        className={textButton}
        onClick={props.onStartRename}
      >
        {t('manageChapters.rename')}
      </button>
      <PublishToggle chapter={chapter} isBusy={props.isBusy} onChange={props.onChange} />
      <button
        type="button"
        className={cn(textButton, 'text-destructive')}
        onClick={props.onAskDelete}
      >
        {t('manageChapters.delete')}
      </button>
    </div>
  );
}
