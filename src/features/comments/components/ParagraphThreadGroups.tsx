/**
 * ParagraphThreadGroups: a stanza's comments in its panel, grouped (READER-SELECT; board
 * B13-ReaderPartComments, redrawn 24 Nov 2026 after Robert picked option A).
 *
 * Comments on the whole stanza come first, with no heading. Then one group per underlined part,
 * in text order, headed by its words in small italic with a thin bar in the theme colour; the
 * heading is a button that brings those words into view in the text. The group the panel opened at is
 * tinted and scrolled into view. Pointing at a group tints its words in the text, and pointing at
 * underlined words tints their group (hoverKey in ParagraphCommentsContext). A comment in the
 * first group whose words the writer has since changed keeps its quote above its text.
 * Who uses it: ParagraphThread. What it calls: groupStanzaComments (lib/commentParts.ts) and
 * CommentItem for each comment.
 */
import { useContext, useEffect, useRef, type RefObject } from 'react';

import type { ChapterAddress } from '@/features/reading/api/likes';
import type { CommentPart } from '@/features/reading/api/paragraphComments';
import { ParagraphCommentsContext } from '@/features/reading/lib/paragraphCommentsContext';
import { rangeOfSpan } from '@/features/reading/lib/textParts';
import { cn } from '@/lib/utils';

import type { ChapterComment, CommentQuote } from '../api/comments';
import { groupStanzaComments, quoteForReading, type CommentGroup } from '../lib/commentParts';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { CommentItem } from './CommentItem';

/** What the groups need. */
interface ParagraphThreadGroupsProps {
  address: ChapterAddress;
  comments: ChapterComment[];
  /** The underlined parts that start in this stanza, in text order. */
  parts: CommentPart[];
  /** The key of the part the panel is open at, or null for the whole stanza. */
  activeKey: string | null;
  /** True while the writer's pause of new comments runs (CALM-8): Reply is hidden. */
  isPaused: boolean;
}

/**
 * Scrolls the chapter text to a part's words, so the reader sees what a group is about.
 *
 * @param quote - the part's words and where they are
 */
function showWordsInText(quote: CommentQuote) {
  const root = document.querySelector('.tmc-chapter-text');
  if (root === null) return;
  const span = {
    block: quote.startBlock,
    endBlock: quote.endBlock,
    startOffset: quote.startOffset,
    endOffset: quote.endOffset,
  };
  const box = rangeOfSpan(root, span)?.getBoundingClientRect();
  if (box === undefined) return;
  // Bring the words to the middle of the window; the group's hover keeps them tinted.
  window.scrollBy({ top: box.top + box.height / 2 - window.innerHeight / 2, behavior: 'smooth' });
}

/** What one group needs. */
interface GroupProps {
  address: ChapterAddress;
  group: CommentGroup;
  isActive: boolean;
  isPaused: boolean;
}

/**
 * Pointing at a group tints its words in the text (board B13). Only a pointer does this: the
 * heading button is the keyboard's way to the words, so the listeners sit on the element itself.
 *
 * @param groupRef - the group's element
 * @param key - the part's key
 */
function usePointingTint(groupRef: RefObject<HTMLDivElement | null>, key: string) {
  const setHoverKey = useContext(ParagraphCommentsContext)?.setHoverKey;
  useEffect(() => {
    const group = groupRef.current;
    if (group === null || setHoverKey === undefined) return undefined;
    const enter = () => setHoverKey(key);
    const leave = () => setHoverKey(null);
    group.addEventListener('mouseenter', enter);
    group.addEventListener('mouseleave', leave);
    return () => {
      group.removeEventListener('mouseenter', enter);
      group.removeEventListener('mouseleave', leave);
    };
  }, [groupRef, key, setHoverKey]);
}

/**
 * One part's group: its heading and its comments; the active one is tinted and comes into view.
 *
 * @returns the group
 */
function PartGroup({ address, group, isActive, isPaused }: GroupProps) {
  const { t } = useCommentsTranslation();
  const comments = useContext(ParagraphCommentsContext);
  const groupRef = useRef<HTMLDivElement>(null);
  const key = group.key ?? '';
  const words = quoteForReading(group.quote?.text ?? '');
  const isPointedAt = comments?.hoverKey === key;
  // The group the panel opened at comes into view (board B13: "scrolled to their group").
  useEffect(() => {
    if (isActive) groupRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isActive]);
  usePointingTint(groupRef, key);
  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={t('part.groupLabel', { words })}
      className={cn('tmc-comment-group', (isActive || isPointedAt) && 'tmc-comment-group--active')}
    >
      <button
        type="button"
        className="tmc-comment-group__words"
        aria-label={t('part.showWords', { words })}
        onClick={() => {
          if (group.quote !== null) showWordsInText(group.quote);
        }}
      >
        “{words}”
      </button>
      {group.comments.map((comment) => (
        <CommentItem
          key={comment.id}
          address={address}
          comment={comment}
          isInParagraphThread
          isPaused={isPaused}
          isQuoteShown={false}
        />
      ))}
    </div>
  );
}

/**
 * Renders the groups: the whole stanza's comments, then each part's.
 *
 * @returns the groups
 */
export function ParagraphThreadGroups(props: ParagraphThreadGroupsProps) {
  const { address, isPaused, activeKey } = props;
  const [whole, ...partGroups] = groupStanzaComments(props.comments, props.parts);
  return (
    <div className="mt-2">
      {whole !== undefined && whole.comments.length > 0 && (
        <div className="divide-y divide-hairline">
          {whole.comments.map((comment) => (
            <CommentItem
              key={comment.id}
              address={address}
              comment={comment}
              isInParagraphThread
              isPaused={isPaused}
            />
          ))}
        </div>
      )}
      {partGroups.map((group) => (
        <PartGroup
          key={group.key}
          address={address}
          group={group}
          isActive={group.key === activeKey}
          isPaused={isPaused}
        />
      ))}
    </div>
  );
}
