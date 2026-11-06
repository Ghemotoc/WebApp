/**
 * BoardCard: one chapter on the chapter board (story S1-E17-19: "each card shows its label
 * (Prologue, Chapter 3, Epilogue…), title, POV, status, words against target and in-world date").
 *
 * The title is a link to the chapter in the writing view. A published chapter carries a
 * "Published" pill beside its planning status, so the two are never confused. The card can be
 * dragged, and its four move buttons do the same by keyboard or on a phone (WCAG 2.5.7).
 * Who uses it: BoardColumnSection. What it calls: the move and drag handlers it is given.
 */
import type { DragEvent } from 'react';
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';

import type { StorylineChapter } from '../api/storyline';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BoardCardMoves, type BoardCardMovesProps } from './BoardCardMoves';
import { PlanningStatusPill } from './PlanningStatusPill';

/** What the card needs. */
export interface BoardCardProps extends Omit<BoardCardMovesProps, 'title'> {
  slug: string;
  chapter: StorylineChapter;
  /** "Chapter 3", "Prologue" … */
  label: string;
  /** The point-of-view character's name, or null. */
  povName: string | null;
  onDragStart: () => void;
  onDropOnCard: (event: DragEvent<HTMLElement>) => void;
}

/** The words written, against the target when there is one. */
function WordsLine({ chapter }: { chapter: StorylineChapter }) {
  const { t, i18n } = useAtlasTranslation();
  const numbers = new Intl.NumberFormat(i18n.language);
  if (chapter.wordTarget === null) {
    return (
      <>
        {t('storyline.board.words', {
          count: chapter.wordCount,
          words: numbers.format(chapter.wordCount),
        })}
      </>
    );
  }
  return (
    <>
      {t('chapterPlan.wordsOfTarget', {
        words: numbers.format(chapter.wordCount),
        target: numbers.format(chapter.wordTarget),
      })}
    </>
  );
}

/**
 * Renders the card.
 *
 * @returns the list item with the chapter's details and its move buttons
 */
export function BoardCard(props: BoardCardProps) {
  const { t } = useAtlasTranslation();
  const { slug, chapter, label, povName } = props;
  const title = chapter.title === '' ? t('storyline.board.untitled') : chapter.title;
  return (
    <li
      id={`atlas-board-card-${chapter.code}`}
      tabIndex={-1}
      data-testid="atlas-board-card"
      className="rounded-xl border border-border bg-surface shadow-card"
    >
      {/* The card is a drag source and a drop zone; the move buttons do the same by keyboard. */}
      <div
        role="presentation"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', chapter.code);
          props.onDragStart();
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={props.onDropOnCard}
        className="flex cursor-grab flex-col gap-2 p-4"
      >
        <p className="m-0 eyebrow">{label}</p>
        <Link
          to={`/write/s/${slug}/c/${chapter.code}`}
          className="font-heading text-lg leading-tight font-bold break-words text-heading"
        >
          {title}
        </Link>
        <div className="flex flex-wrap gap-1.5">
          <PlanningStatusPill status={chapter.planningStatus} />
          {chapter.status === 'published' && (
            <InfoPill tone="plum">{t('storyline.board.published')}</InfoPill>
          )}
        </div>
        <p className="m-0 text-sm text-body">
          {povName === null
            ? t('storyline.board.noPov')
            : t('storyline.board.pov', { name: povName })}
        </p>
        <p className="m-0 text-sm text-meta">
          <WordsLine chapter={chapter} />
        </p>
        {chapter.worldDate !== '' && (
          <p className="m-0 text-sm text-meta">
            {t('storyline.board.worldDate', { date: chapter.worldDate })}
          </p>
        )}
        <BoardCardMoves title={title} {...props} />
      </div>
    </li>
  );
}
