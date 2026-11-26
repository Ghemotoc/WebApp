/**
 * ManagedChapterRow: one chapter on a story's Chapters page (story S1-E3-04; board D03, user
 * story 5.3).
 *
 * What it shows, left to right: the title with its number ("Chapter 3: The lighthouse", a link
 * to the editor) over a meta line that says what readers know ("Published · 18 Sep · 2,300
 * words", "Draft · saved 23 Oct · 240 words", "… · the last chapter"; lib/chapterListText.ts),
 * then ChapterRowActions. The number is the chapter's place in the reading order, so it changes
 * when the chapter moves; a chapter whose number changed in the last 7 days says where it was
 * ("was chapter 13", GAPS-11). The board's plain row replaces the pills and the drag handle.
 * Rename (in More) turns the title into RenameChapterForm; when it closes, focus goes back to
 * the "…" button. Copy link says whether it worked in a status line under the meta line.
 * Dragging: the row's title and meta line are what a person drags (dnd-kit's useSortable; the
 * sensors are in SortableChapterList), so its buttons never start a drag, and nor does the
 * rename field. The dragged row follows the pointer, so its title link is under it when the
 * button comes up; SortableChapterList drops that click (lib/blockClickAfterDrag.ts).
 * Earlier and Later are the keyboard way.
 * Who uses it: SortableChapterList. What it calls: dnd-kit, ChapterRowActions,
 * RenameChapterForm, MetaLine, lib/chapterListText.ts and sharing's copy helpers.
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { copyText } from '@/features/sharing/lib/clipboard';
import { chapterShareLink } from '@/features/sharing/lib/shareLink';
import { cn } from '@/lib/utils';

import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';
import { chapterRowFacts } from '../lib/chapterListText';

import { ChapterRowActions } from './ChapterRowActions';
import { RenameChapterForm } from './RenameChapterForm';

/** What a row needs. */
export interface ManagedChapterRowProps {
  slug: string;
  chapter: ManagedChapter;
  number: number;
  isLast: boolean;
  /** The chapter's likes from the writer dashboard, or null. */
  likes: number | null;
  isBusy: boolean;
  onChange: (change: ChapterChange) => void;
  onAskDelete: (chapter: ManagedChapter) => void;
}

/** The middle of the row: the title (or the rename field) and the meta line under it. */
function ChapterRowText(props: {
  slug: string;
  chapter: ManagedChapter;
  number: number;
  likes: number | null;
  isRenaming: boolean;
  copyNote: string | null;
  /** dnd-kit's mouse and touch listeners: the text is the part a person drags. */
  dragListeners: ReturnType<typeof useSortable>['listeners'];
  onRename: (title: string) => void;
  onCancelRename: () => void;
}) {
  const { t, i18n } = useTranslation('writing');
  const { chapter } = props;
  const title = chapter.title === '' ? t('manageChapters.untitled') : chapter.title;
  const facts = chapterRowFacts(t, chapter, {
    language: i18n.language,
    now: new Date(),
    likes: props.likes,
  });
  return (
    <div {...props.dragListeners} className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
      {props.isRenaming ? (
        <RenameChapterForm
          code={chapter.code}
          number={props.number}
          title={chapter.title}
          onCancel={props.onCancelRename}
          onSave={props.onRename}
        />
      ) : (
        <Link
          to={`/write/s/${props.slug}/c/${chapter.code}`}
          draggable={false}
          className="w-fit type-label font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {t('manageChapters.rowTitle', { number: props.number, title })}
        </Link>
      )}
      <MetaLine facts={facts} />
      {/* Says whether Copy link worked; read out when it changes. */}
      <span role="status" className="type-meta empty:hidden">
        {props.copyNote}
      </span>
    </div>
  );
}

/**
 * Whether the title is being renamed, and focus back on "…" when that ends.
 *
 * @returns isRenaming, start, stop and the "…" button's ref
 */
function useRenaming() {
  const [isRenaming, setIsRenaming] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const wasRenaming = useRef(false);
  useEffect(() => {
    if (wasRenaming.current && !isRenaming) moreButtonRef.current?.focus();
    wasRenaming.current = isRenaming;
  }, [isRenaming]);
  return {
    isRenaming,
    moreButtonRef,
    start: () => setIsRenaming(true),
    stop: () => setIsRenaming(false),
  };
}

/**
 * Copies the chapter's public link and keeps the line that says how it went.
 *
 * @param slug - the story's address
 * @param chapter - the chapter
 * @param number - its place in the reading order, for the words
 * @returns the line (null until a copy) and the copy function
 */
function useCopyLink(slug: string, chapter: ManagedChapter, number: number) {
  const { t } = useTranslation('writing');
  const [copyNote, setCopyNote] = useState<string | null>(null);
  async function copyLink() {
    const link = chapterShareLink({ storySlug: slug, chapterCode: chapter.code });
    const copied = await copyText(link);
    setCopyNote(
      copied ? t('manageChapters.linkCopied', { number }) : t('manageChapters.copyFailed'),
    );
  }
  return { copyNote, copyLink };
}

/**
 * Renders the row.
 *
 * @returns the list item
 */
export function ManagedChapterRow(props: ManagedChapterRowProps) {
  const { chapter, number } = props;
  const renaming = useRenaming();
  const copying = useCopyLink(props.slug, chapter, number);
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.code,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline bg-page py-3 select-none',
        isDragging && 'z-10 rounded-card shadow-card',
      )}
    >
      <ChapterRowText
        slug={props.slug}
        chapter={chapter}
        number={number}
        likes={props.likes}
        isRenaming={renaming.isRenaming}
        copyNote={copying.copyNote}
        dragListeners={renaming.isRenaming ? undefined : listeners}
        onCancelRename={renaming.stop}
        onRename={(title) => {
          props.onChange({ kind: 'rename', code: chapter.code, title });
          renaming.stop();
        }}
      />
      <ChapterRowActions
        slug={props.slug}
        chapter={chapter}
        number={number}
        isLast={props.isLast}
        isBusy={props.isBusy}
        onChange={props.onChange}
        moreButtonRef={renaming.moreButtonRef}
        onStartRename={renaming.start}
        onAskDelete={() => props.onAskDelete(chapter)}
        onCopyLink={() => void copying.copyLink()}
      />
    </li>
  );
}
