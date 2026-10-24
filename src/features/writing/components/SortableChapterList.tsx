/**
 * SortableChapterList: the ordered list of a story's chapters that can be dragged into a new
 * order (story S1-E3-04; board 4.4, "Chapters in reading order").
 *
 * How dragging works: dnd-kit's DndContext with a pointer sensor (mouse and touch; a 6 px move
 * starts a drag, so a tap on the handle does nothing) and a keyboard sensor (Space picks up, the
 * arrow keys move, Space drops, Escape cancels). Each step is read out by a screen reader in the
 * interface language (the announcements below). When a chapter is dropped somewhere new, the
 * whole new order goes to set_chapter_order() through onChange.
 * Who uses it: ChapterListCard. What it calls: ManagedChapterRow for each chapter.
 */
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';

import { ManagedChapterRow } from './ManagedChapterRow';

/** What the list needs. */
export interface SortableChapterListProps {
  slug: string;
  chapters: ManagedChapter[];
  isBusy: boolean;
  onChange: (change: ChapterChange) => void;
  onAskDelete: (chapter: ManagedChapter) => void;
}

/** Where the dragged chapter was last said to be, so a move is announced only when it changes. */
interface LastSpokenPlace {
  overId: UniqueIdentifier | null;
}

/**
 * The screen reader's words for each step of a drag, with the chapter's title and place.
 * dnd-kit reports "over" straight after the pick-up (over its own place); saying that would
 * replace "Picked up…" before it is heard, so a place is announced only when it changes.
 *
 * @param t - the writing namespace's t()
 * @param chapters - the list as it is now
 * @param lastSpoken - the place last announced, kept across renders by the component
 * @returns dnd-kit's announcements
 */
function dragAnnouncements(
  t: TFunction,
  chapters: ManagedChapter[],
  lastSpoken: LastSpokenPlace,
): Announcements {
  const codes = chapters.map((chapter) => chapter.code);
  const total = chapters.length;
  const titleOf = (id: UniqueIdentifier) =>
    chapters.find((chapter) => chapter.code === id)?.title ?? '';
  const positionOf = (id: UniqueIdentifier) => codes.indexOf(String(id)) + 1;
  return {
    onDragStart: ({ active }) => {
      lastSpoken.overId = active.id;
      return t('manageChapters.drag.pickedUp', {
        title: titleOf(active.id),
        position: positionOf(active.id),
      });
    },
    onDragOver: ({ active, over }) => {
      if (over === null || over.id === lastSpoken.overId) return undefined;
      lastSpoken.overId = over.id;
      return t('manageChapters.drag.over', {
        title: titleOf(active.id),
        position: positionOf(over.id),
        total,
      });
    },
    onDragEnd: ({ active, over }) =>
      over === null
        ? t('manageChapters.drag.cancelled', { title: titleOf(active.id) })
        : t('manageChapters.drag.dropped', {
            title: titleOf(active.id),
            position: positionOf(over.id),
            total,
          }),
    onDragCancel: ({ active }) => t('manageChapters.drag.cancelled', { title: titleOf(active.id) }),
  };
}

/**
 * Renders the list.
 *
 * @returns the ordered list inside its drag context
 */
export function SortableChapterList(props: SortableChapterListProps) {
  const { t } = useTranslation('writing');
  const { chapters } = props;
  const codes = chapters.map((chapter) => chapter.code);
  // One object for the whole life of the list: the drag's announcements write to it.
  const [lastSpoken] = useState<LastSpokenPlace>(() => ({ overId: null }));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** A drop somewhere new sends the whole new order. */
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over === null || active.id === over.id) return;
    const newOrder = arrayMove(
      codes,
      codes.indexOf(String(active.id)),
      codes.indexOf(String(over.id)),
    );
    props.onChange({ kind: 'order', codes: newOrder });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: dragAnnouncements(t, chapters, lastSpoken),
        screenReaderInstructions: { draggable: t('manageChapters.drag.instructions') },
      }}
    >
      <SortableContext items={codes} strategy={verticalListSortingStrategy}>
        <ol aria-label={t('manageChapters.listLabel')} className="m-0 list-none p-0">
          {chapters.map((chapter, index) => (
            <ManagedChapterRow
              key={chapter.code}
              slug={props.slug}
              chapter={chapter}
              number={index + 1}
              isLast={index === chapters.length - 1}
              isBusy={props.isBusy}
              onChange={props.onChange}
              onAskDelete={props.onAskDelete}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
