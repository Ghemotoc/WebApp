/**
 * SortableChapterList: the ordered list of a story's chapters that can be dragged into a new
 * order (story S1-E3-04; board D03, user story 5.3: "drag a row, or Earlier and Later").
 *
 * How dragging works: the whole row is what a person drags (board D03 draws no handle), through
 * dnd-kit's DndContext with a mouse sensor (a 6 px move starts a drag, so a click on the title or
 * a button still works) and a touch sensor (a press held for a quarter of a second, so a swipe
 * still scrolls the page on a phone). The keyboard and screen reader way is Earlier and Later on
 * each row, the button alternative WCAG 2.2, 2.5.7 asks for. A pointer drag is still read out in
 * the interface language (the announcements below). When a chapter is dropped somewhere new, the
 * whole new order goes to set_chapter_order() through onChange, with the dragged chapter's code
 * so the page can ask first when a published chapter would change number (G9d).
 * A long story can hide its earlier chapters (firstShown, from ChapterList); the order sent is
 * always the whole story's, and the numbers keep counting from chapter 1. A drag ends over the
 * dragged row's own title link, so the click that follows is dropped (lib/blockClickAfterDrag).
 * Who uses it: ChapterList. What it calls: ManagedChapterRow for each chapter shown.
 */
import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DashboardChapter } from '../api/dashboard';
import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';
import { blockClickAfterDrag } from '../lib/blockClickAfterDrag';
import { chapterLikes } from '../lib/chapterStats';

import { ManagedChapterRow } from './ManagedChapterRow';

/** What the list needs. */
export interface SortableChapterListProps {
  slug: string;
  chapters: ManagedChapter[];
  /** The writer dashboard's chapters, for each row's likes. */
  dashboardChapters: DashboardChapter[];
  /** How many of the earliest chapters are hidden (0 shows them all). */
  firstShown: number;
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
  const { chapters, firstShown } = props;
  const codes = chapters.map((chapter) => chapter.code);
  const shownChapters = chapters.slice(firstShown);
  // One object for the whole life of the list: the drag's announcements write to it.
  const [lastSpoken] = useState<LastSpokenPlace>(() => ({ overId: null }));
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  /** A drop somewhere new sends the whole new order. */
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over === null || active.id === over.id) return;
    const newOrder = arrayMove(
      codes,
      codes.indexOf(String(active.id)),
      codes.indexOf(String(over.id)),
    );
    props.onChange({ kind: 'order', codes: newOrder, movedCode: String(active.id) });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      // The row follows the pointer, so the drop lands on its title link: drop that click.
      onDragStart={blockClickAfterDrag}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements: dragAnnouncements(t, chapters, lastSpoken) }}
    >
      <SortableContext
        items={shownChapters.map((chapter) => chapter.code)}
        strategy={verticalListSortingStrategy}
      >
        <ol
          aria-label={t('manageChapters.listLabel')}
          start={firstShown + 1}
          className="m-0 list-none p-0"
        >
          {shownChapters.map((chapter, index) => (
            <ManagedChapterRow
              key={chapter.code}
              slug={props.slug}
              chapter={chapter}
              number={firstShown + index + 1}
              isLast={firstShown + index === chapters.length - 1}
              likes={chapterLikes(props.dashboardChapters, chapter.code)}
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
