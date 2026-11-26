/**
 * ChapterRowActions: the buttons at the end of each row on a story's Chapters page (story
 * S1-E3-04; board D03, user story 5.3): Earlier and Later, Edit, then "…" (More) with Rename,
 * Preview, Schedule or Unpublish (or Publish again), Copy link and Delete.
 *
 * Board values: 44 px round icon buttons for the arrows and More, Edit as a quiet button. The
 * arrows at the ends use aria-disabled, not disabled, so a keyboard user who just moved a chapter
 * to the top keeps focus on the button instead of losing it to the page. On phones (under 600
 * px) the arrows move into More, as the story asks. Delete is last, in the danger ink, with its
 * word (MoreMenu), and asks once (DeleteChapterDialog, on the page).
 * Preview and Schedule open the editor on that chapter with its preview, or its publish panel
 * on Later (the editor reads `?preview` and `?publish=later`); a scheduled chapter's item says
 * "Change the schedule". Copy link copies the chapter's public address (sharing/lib/shareLink).
 * Who uses it: ManagedChapterRow. What it calls: MoreMenu; the row passes the changes up to
 * useManageChapters.
 */
import type { ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { MoreMenu, type MoreMenuItem } from '@/components/ui/MoreMenu';
import { cn } from '@/lib/utils';

import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';

import { ArrowEarlierIcon, ArrowLaterIcon } from './ManageChaptersIcons';

/** What the actions need. */
export interface ChapterRowActionsProps {
  slug: string;
  chapter: ManagedChapter;
  /** The chapter's place in the reading order, from 1. */
  number: number;
  isLast: boolean;
  isBusy: boolean;
  onChange: (change: ChapterChange) => void;
  onStartRename: () => void;
  onAskDelete: () => void;
  onCopyLink: () => void;
  /** The "…" button, so focus can come back to it after Rename. */
  moreButtonRef: RefObject<HTMLButtonElement | null>;
}

/** One round arrow button; inactive at the end of the list. Hidden on phones (they use More). */
function ArrowButton(props: {
  label: string;
  isOff: boolean;
  onMove: () => void;
  children: ReactNode;
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
        'grid size-11 place-items-center rounded-full text-ink-heading max-sm:hidden',
        props.isOff ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-tint',
      )}
    >
      {props.children}
    </button>
  );
}

/**
 * The item that changes who can read the chapter: Unpublish for a published one, Publish again
 * for one taken back, and none for a draft or a scheduled one.
 *
 * @param props - the chapter, whether a change is running and the change callback
 * @param t - the writing translations
 * @returns the item, or null
 */
function publishItem(
  props: ChapterRowActionsProps,
  t: ReturnType<typeof useTranslation>['t'],
): MoreMenuItem | null {
  const { chapter } = props;
  if (props.isBusy) return null;
  if (chapter.state === 'published') {
    return {
      key: 'unpublish',
      label: t('manageChapters.unpublish'),
      onSelect: () => props.onChange({ kind: 'unpublish', code: chapter.code }),
    };
  }
  if (chapter.state !== 'unpublished') return null;
  return {
    key: 'publish-again',
    label: t('manageChapters.publishAgain'),
    onSelect: () => props.onChange({ kind: 'publish', code: chapter.code }),
  };
}

/**
 * Builds the More menu's items for one chapter, in the board's order.
 *
 * @param props - the row's actions
 * @param t - the writing translations
 * @returns the items
 */
function moreItems(
  props: ChapterRowActionsProps,
  t: ReturnType<typeof useTranslation>['t'],
): MoreMenuItem[] {
  const { chapter, number } = props;
  const editorAddress = `/write/s/${props.slug}/c/${chapter.code}`;
  const items: MoreMenuItem[] = [];
  // Step 1: on phones the arrows live here (story 5.3); they are hidden from 600 px.
  if (number > 1 && !props.isBusy) {
    items.push({
      key: 'earlier',
      label: t('manageChapters.earlier'),
      onlyOnPhones: true,
      onSelect: () => props.onChange({ kind: 'move', code: chapter.code, direction: -1 }),
    });
  }
  if (!props.isLast && !props.isBusy) {
    items.push({
      key: 'later',
      label: t('manageChapters.later'),
      onlyOnPhones: true,
      onSelect: () => props.onChange({ kind: 'move', code: chapter.code, direction: 1 }),
    });
  }
  // Step 2: the chapter's own actions.
  items.push({ key: 'rename', label: t('manageChapters.rename'), onSelect: props.onStartRename });
  items.push({
    key: 'preview',
    label: t('manageChapters.preview'),
    to: `${editorAddress}?preview`,
  });
  if (chapter.state !== 'published') {
    const scheduleLabel =
      chapter.state === 'scheduled'
        ? t('manageChapters.changeSchedule')
        : t('manageChapters.schedule');
    items.push({ key: 'schedule', label: scheduleLabel, to: `${editorAddress}?publish=later` });
  }
  const publishToggle = publishItem(props, t);
  if (publishToggle !== null) items.push(publishToggle);
  if (chapter.state === 'published') {
    items.push({ key: 'copy', label: t('manageChapters.copyLink'), onSelect: props.onCopyLink });
  }
  // Step 3: Delete is always last, in the danger ink.
  items.push({
    key: 'delete',
    label: t('manageChapters.delete'),
    isDanger: true,
    onSelect: props.onAskDelete,
  });
  return items;
}

/**
 * Renders the actions.
 *
 * @returns the arrows, Edit and More
 */
export function ChapterRowActions(props: ChapterRowActionsProps) {
  const { t } = useTranslation('writing');
  const { chapter, number } = props;
  return (
    <div className="flex flex-none items-center gap-1">
      <ArrowButton
        label={t('manageChapters.moveUp', { number })}
        isOff={number === 1 || props.isBusy}
        onMove={() => props.onChange({ kind: 'move', code: chapter.code, direction: -1 })}
      >
        <ArrowEarlierIcon />
      </ArrowButton>
      <ArrowButton
        label={t('manageChapters.moveDown', { number })}
        isOff={props.isLast || props.isBusy}
        onMove={() => props.onChange({ kind: 'move', code: chapter.code, direction: 1 })}
      >
        <ArrowLaterIcon />
      </ArrowButton>
      <Link
        to={`/write/s/${props.slug}/c/${chapter.code}`}
        draggable={false}
        className={buttonClassName({ variant: 'secondary' })}
      >
        {t('manageChapters.edit')}
      </Link>
      <MoreMenu
        label={t('manageChapters.more', { number })}
        items={moreItems(props, t)}
        triggerRef={props.moreButtonRef}
      />
    </div>
  );
}
