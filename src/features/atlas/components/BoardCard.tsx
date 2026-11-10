/**
 * BoardCard: one chapter on the chapter board (story S1-E17-19: "each card shows its label
 * (Prologue, Chapter 3, Epilogue…), title, POV, status, words against target and in-world date").
 *
 * A small glass card (bundle G10 ATLAS, part c1; board AtlasStoryline): the label and the planning
 * status pill on top, the title as a link to the chapter in the writing view, then one grey line
 * of facts ("POV: Ana · 4 words · Published"), where "Published" is the word itself, so it is
 * never confused with the planning status. The card can be
 * dragged, and its four move buttons do the same by keyboard or on a phone (WCAG 2.5.7).
 * Who uses it: BoardColumnSection. What it calls: the move and drag handlers it is given.
 */
import type { DragEvent } from 'react';
import { Link } from 'react-router';

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

/** The grey line of facts: who tells it, the words and, when it is out, "Published". */
function CardFacts({ chapter, povName }: { chapter: StorylineChapter; povName: string | null }) {
  const { t } = useAtlasTranslation();
  return (
    <p className="m-0 text-[13px] break-words text-meta">
      {povName === null ? t('storyline.board.noPov') : t('storyline.board.pov', { name: povName })}
      {' · '}
      <WordsLine chapter={chapter} />
      {chapter.status === 'published' && ` · ${t('storyline.board.published')}`}
      {chapter.worldDate !== '' && (
        <span className="block">{t('storyline.board.worldDate', { date: chapter.worldDate })}</span>
      )}
    </p>
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
      className="rounded-[20px] border border-border bg-surface shadow-card"
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
        className="flex cursor-grab flex-col gap-2 p-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-[13px] font-bold text-meta">{label}</span>
          <PlanningStatusPill status={chapter.planningStatus} />
        </div>
        <Link
          to={`/write/s/${slug}/c/${chapter.code}`}
          className="self-start text-base leading-snug font-bold break-words text-heading no-underline hover:underline"
        >
          {title}
        </Link>
        <CardFacts chapter={chapter} povName={povName} />
        <BoardCardMoves title={title} {...props} />
      </div>
    </li>
  );
}
