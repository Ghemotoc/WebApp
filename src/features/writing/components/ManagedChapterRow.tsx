/**
 * ManagedChapterRow: one chapter on Manage chapters (story S1-E3-04; board 4.4).
 *
 * What it shows, left to right: the drag handle, the title with its number ("Chapter 3: The
 * lighthouse", a link to the editor) and its status pill, the meta line under it, then
 * ChapterRowActions. The number is the chapter's place in the reading order, so it changes
 * when the chapter moves (liquid glass Chapters board, G9d; it replaces the sand number tile).
 * Rename turns the title into RenameChapterForm; when it closes, focus goes back to the Rename
 * button.
 * Pills (DoD pill system; board 4.4): Published sage, Draft gold, Scheduled sky, Unpublished
 * neutral.
 * Dragging: the handle is the only part that starts a drag (dnd-kit's useSortable with the
 * handle as the activator), by mouse, touch or keyboard (Space, arrows, Space). The arrows are
 * the button alternative the DoD asks for.
 * Who uses it: SortableChapterList. What it calls: dnd-kit, ChapterRowActions,
 * RenameChapterForm and lib/chapterListText.ts for the meta line.
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import { cn } from '@/lib/utils';

import type { ManagedChapter, ManagedChapterState } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';
import { chapterMeta } from '../lib/chapterListText';

import { ChapterRowActions } from './ChapterRowActions';
import { GripIcon } from './ManageChaptersIcons';
import { RenameChapterForm } from './RenameChapterForm';

/** The pill tone for each state (board 4.4). */
const pillTones: Record<ManagedChapterState, PillTone> = {
  published: 'sage',
  draft: 'gold',
  scheduled: 'sky',
  unpublished: 'neutral',
};

/** What a row needs. */
export interface ManagedChapterRowProps {
  slug: string;
  chapter: ManagedChapter;
  number: number;
  isLast: boolean;
  isBusy: boolean;
  onChange: (change: ChapterChange) => void;
  onAskDelete: (chapter: ManagedChapter) => void;
}

/** The title as a link to the editor ("Chapter 3: The lighthouse"), with its pill. */
function ChapterTitle(props: { slug: string; chapter: ManagedChapter; number: number }) {
  const { slug, chapter, number } = props;
  const { t } = useTranslation('writing');
  return (
    <span className="flex flex-wrap items-center gap-2.5">
      <Link
        to={`/write/s/${slug}/c/${chapter.code}`}
        className="font-heading text-[19px] font-bold break-words text-ink no-underline hover:underline"
      >
        {t('manageChapters.rowTitle', {
          number,
          title: chapter.title === '' ? t('manageChapters.untitled') : chapter.title,
        })}
      </Link>
      <InfoPill tone={pillTones[chapter.state]}>
        {t(`manageChapters.state.${chapter.state}`)}
      </InfoPill>
    </span>
  );
}

/** The middle of the row: the title (or the rename field) and the meta line under it. */
function ChapterRowText(props: {
  slug: string;
  chapter: ManagedChapter;
  number: number;
  isRenaming: boolean;
  onRename: (title: string) => void;
  onCancelRename: () => void;
}) {
  const { t, i18n } = useTranslation('writing');
  const { chapter } = props;
  return (
    <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1">
      {props.isRenaming ? (
        <RenameChapterForm
          code={chapter.code}
          number={props.number}
          title={chapter.title}
          onCancel={props.onCancelRename}
          onSave={props.onRename}
        />
      ) : (
        <ChapterTitle slug={props.slug} chapter={chapter} number={props.number} />
      )}
      <span className="text-sm text-meta">{chapterMeta(t, chapter, i18n.language)}</span>
    </div>
  );
}

/**
 * Whether the title is being renamed, and focus back on Rename when that ends.
 *
 * @returns isRenaming, start, stop and the Rename button's ref
 */
function useRenaming() {
  const [isRenaming, setIsRenaming] = useState(false);
  const renameButtonRef = useRef<HTMLButtonElement>(null);
  const wasRenaming = useRef(false);
  useEffect(() => {
    if (wasRenaming.current && !isRenaming) renameButtonRef.current?.focus();
    wasRenaming.current = isRenaming;
  }, [isRenaming]);
  return {
    isRenaming,
    renameButtonRef,
    start: () => setIsRenaming(true),
    stop: () => setIsRenaming(false),
  };
}

/**
 * Renders the row.
 *
 * @returns the list item
 */
export function ManagedChapterRow(props: ManagedChapterRowProps) {
  const { t } = useTranslation('writing');
  const { chapter, number } = props;
  const renaming = useRenaming();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.code });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-border bg-surface py-3.5',
        isDragging && 'z-10 rounded-2xl shadow-card',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t('manageChapters.dragLabel', { number })}
        className="inline-flex size-11 flex-none cursor-grab touch-none items-center justify-center rounded-full text-meta hover:bg-tint"
      >
        <GripIcon />
      </button>
      <ChapterRowText
        slug={props.slug}
        chapter={chapter}
        number={number}
        isRenaming={renaming.isRenaming}
        onCancelRename={renaming.stop}
        onRename={(title) => {
          props.onChange({ kind: 'rename', code: chapter.code, title });
          renaming.stop();
        }}
      />
      <ChapterRowActions
        {...props}
        renameButtonRef={renaming.renameButtonRef}
        onStartRename={renaming.start}
        onAskDelete={() => props.onAskDelete(chapter)}
      />
    </li>
  );
}
