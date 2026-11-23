/**
 * StoryFooterAbout: the story statement in the footer of the story page and the reader (CALM-9s;
 * Robert's canvas comments of 23 Nov 2026, boards B01 to B06: "this helps for discoverability").
 *
 * "[Title] is a [genre] [type] published on [site] by [pen name or username]." with the title in
 * <cite> and the name linking to the profile; "For mature readers." for 18+ only; then the blurb;
 * then "[site] is a free website for writing and reading stories, poems and essays." The words
 * come from src/lib/story-statement.ts, the same builder the page's search tags use, so people and
 * search engines read the same statement. Real, visible text: never hidden.
 * Who uses it: AppLayout, in the Footer's first place, while useStoryStatement gives a statement.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { brand } from '@/config/brand';
import {
  statementSentence,
  statementSiteLine,
  type StatementPiece,
  type StoryStatementWords,
} from '@/lib/story-statement';

import type { StoryStatement } from '../api/storyStatement';

/**
 * One piece of the sentence: the title as a <cite>, the writer as a profile link, or words.
 *
 * @param props.piece - the piece
 * @param props.writerHandle - the username for the link, or null for a classic's author
 * @returns the piece
 */
function SentencePiece({
  piece,
  writerHandle,
}: {
  piece: StatementPiece;
  writerHandle: string | null;
}) {
  if (piece.kind === 'title') return <cite className="font-semibold not-italic">{piece.text}</cite>;
  if (piece.kind === 'writer' && writerHandle !== null) {
    // Underlined: a link inside a sentence must not rely on colour alone (WCAG 1.4.1, axe
    // link-in-text-block).
    return (
      <Link to={`/u/${writerHandle}`} className="underline underline-offset-2">
        {piece.text}
      </Link>
    );
  }
  return <>{piece.text}</>;
}

/**
 * Renders the statement.
 *
 * @param props.statement - the story's facts, blurb and the writer's username
 * @returns the paragraphs
 */
export function StoryFooterAbout({ statement }: { statement: StoryStatement }) {
  const { t } = useTranslation('reading');
  // The sentence's words in the interface language (the reading namespace's storyFooter keys).
  const words = t('storyFooter', { returnObjects: true }) as StoryStatementWords;
  const pieces = statementSentence(statement.facts, words, brand.productName);

  return (
    // break-words: a title or name that is one long word stays inside a 390 px screen.
    <div className="max-w-[46ch] type-body break-words">
      <p className="m-0 text-ink">
        {pieces.map((piece, index) => (
          <SentencePiece key={index} piece={piece} writerHandle={statement.writerHandle} />
        ))}
      </p>
      {statement.facts.isMature && <p className="mt-4 mb-0 text-ink">{words.matureReaders}.</p>}
      {statement.blurb.trim() !== '' && <p className="mt-4 mb-0 text-ink-muted">{statement.blurb}</p>}
      <p className="mt-4 mb-0 type-meta text-ink-muted">
        {statementSiteLine(words, brand.productName)}
      </p>
    </div>
  );
}
