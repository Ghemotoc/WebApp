/**
 * BoardCardFace: what a chapter card on the chapter board shows (story S1-E17-19: "each card
 * shows its label (Prologue, Chapter 3, Epilogue…), title, POV, status, words against target and
 * in-world date"; CALM-9, board E28).
 *
 * The board's layout: a six-dot grip on the left, which says the card can be dragged; a meta line
 * with the planning status in bold and the label ("Drafting · Chapter 3"); the title as a link to
 * the chapter in the writing view; the round "…" menu on the right; then one grey line of facts
 * ("POV: Ana · 4 words · Published"), where "Published" or "Draft" is the word itself, so it is
 * never confused with the planning status (story 6.9). The same face is drawn twice while a card is
 * dragged: on the board, and as the lifted copy that follows the pointer (isCopy), which has no
 * link and no menu, so a keyboard or a screen reader never meets it.
 * Who uses it: BoardCard and ChapterBoard (the lifted copy). What it calls: MetaLine and the menu
 * it is given.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { MetaLine } from '@/components/ui/MetaLine';

import type { StorylineChapter } from '../api/storyline';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the face needs. */
export interface BoardCardFaceProps {
  slug: string;
  chapter: StorylineChapter;
  /** "Chapter 3", "Prologue" … */
  label: string;
  /** The point-of-view character's name, or null. */
  povName: string | null;
  /** The card's "…" menu; null on the lifted copy. */
  menu: ReactNode;
  /** True for the lifted copy that follows the pointer. */
  isCopy?: boolean;
}

/** The words written, against the target when there is one. */
function useWordsText(chapter: StorylineChapter): string {
  const { t, i18n } = useAtlasTranslation();
  const numbers = new Intl.NumberFormat(i18n.language);
  if (chapter.wordTarget === null) {
    return t('storyline.board.words', {
      count: chapter.wordCount,
      words: numbers.format(chapter.wordCount),
    });
  }
  return t('chapterPlan.wordsOfTarget', {
    words: numbers.format(chapter.wordCount),
    target: numbers.format(chapter.wordTarget),
  });
}

/** The grey line of facts: who tells it, the words, and Published or Draft. */
function CardFacts({ chapter, povName }: { chapter: StorylineChapter; povName: string | null }) {
  const { t } = useAtlasTranslation();
  const words = useWordsText(chapter);
  const teller =
    povName === null ? t('storyline.board.noPov') : t('storyline.board.pov', { name: povName });
  // Story 6.9: the card says Published or Draft in words, so it is never confused with the
  // planning status at the top. The in-world date lives on the Timeline, not on the card.
  const readersState =
    chapter.status === 'published' ? t('storyline.board.published') : t('storyline.board.draft');
  // Board E28: the line wraps on a narrow card rather than cutting the words off.
  return (
    <p className="m-0 type-meta break-words text-ink-muted">{`${teller} · ${words} · ${readersState}`}</p>
  );
}

/** The title: a link to the writing view on the board, plain words on the lifted copy. */
function CardTitle({
  slug,
  chapter,
  isCopy,
}: Pick<BoardCardFaceProps, 'slug' | 'chapter' | 'isCopy'>) {
  const { t } = useAtlasTranslation();
  const title = chapter.title === '' ? t('storyline.board.untitled') : chapter.title;
  const classes = 'type-label break-words text-ink-heading';
  if (isCopy === true) return <span className={classes}>{title}</span>;
  return (
    <Link
      to={`/write/s/${slug}/c/${chapter.code}`}
      className={`${classes} self-start no-underline hover:underline`}
    >
      {title}
    </Link>
  );
}

/**
 * Renders the face.
 *
 * @returns the grip, the meta line, the title, the menu and the facts
 */
export function BoardCardFace({ slug, chapter, label, povName, menu, isCopy }: BoardCardFaceProps) {
  const { t } = useAtlasTranslation();
  return (
    // Board E28 (.acard): 12 px above and below, 16 px at the sides, 4 px between the lines.
    <div className="relative flex flex-col gap-1 px-4 py-3">
      {/* The grip only shows that the card can be dragged: the whole card is the handle. It sits
          in the card's left padding, so the words keep the full width board E28 gives them. */}
      <span
        aria-hidden="true"
        className="absolute top-3 left-0 grid h-8 w-4 cursor-grab place-items-center text-ink-muted"
      >
        <ActionIcon name="grip" size={16} />
      </span>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          <MetaLine
            facts={[
              { text: t(`chapterPlan.statuses.${chapter.planningStatus}`), kind: 'state' },
              { text: label },
            ]}
          />
          <CardTitle slug={slug} chapter={chapter} isCopy={isCopy} />
        </div>
        {menu}
      </div>
      <CardFacts chapter={chapter} povName={povName} />
    </div>
  );
}
