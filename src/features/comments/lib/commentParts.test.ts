/**
 * Tests for the chosen-words helpers (READER-SELECT, board B13): keys, short forms and the
 * panel's groups.
 */
import { describe, expect, it } from 'vitest';

import type { CommentPart } from '@/features/reading/api/paragraphComments';

import type { ChapterComment, CommentQuote } from '../api/comments';

import {
  composerKey,
  groupStanzaComments,
  partKey,
  quoteForReading,
  quoteOfPart,
  shortQuote,
} from './commentParts';

/** The knife lines from the boards, as a part in stanza 2. */
const knife: CommentPart = {
  block: 2,
  endBlock: 2,
  startOffset: 37,
  endOffset: 98,
  quote: 'the knife coming towards her heart\nthe way her mother taught her,',
  count: 2,
};

/** A comment with only what the grouping reads. */
function commentOn(id: string, quote: CommentQuote | null): ChapterComment {
  return { id, quote } as ChapterComment;
}

describe('partKey', () => {
  it('gives a comment and its part the same key', () => {
    expect(partKey(quoteOfPart(knife))).toBe(partKey({ ...quoteOfPart(knife) }));
  });

  it('keeps the key when the writer adds a stanza above, so the numbers move', () => {
    const moved = { ...quoteOfPart(knife), startBlock: 3, endBlock: 3 };
    expect(partKey(moved)).toBe(partKey(quoteOfPart(knife)));
  });

  it('changes the key when the words change', () => {
    expect(partKey({ ...quoteOfPart(knife), text: 'the knife' })).not.toBe(
      partKey(quoteOfPart(knife)),
    );
  });
});

describe('quoteForReading and shortQuote', () => {
  it('joins a poem’s lines with a slash, as the boards draw them', () => {
    expect(quoteForReading(knife.quote)).toBe(
      'the knife coming towards her heart / the way her mother taught her,',
    );
  });

  it('shortens long words to eight and an ellipsis', () => {
    expect(shortQuote(knife.quote)).toBe('the knife coming towards her heart / the…');
  });

  it('leaves short words whole', () => {
    expect(shortQuote('nobody ever bleeds.')).toBe('nobody ever bleeds.');
  });
});

describe('groupStanzaComments', () => {
  it('puts the whole stanza first, then each part with its comments', () => {
    const groups = groupStanzaComments(
      [commentOn('a', null), commentOn('b', quoteOfPart(knife)), commentOn('c', null)],
      [knife],
    );
    expect(groups.map((group) => group.comments.map((comment) => comment.id))).toEqual([
      ['a', 'c'],
      ['b'],
    ]);
    expect(groups[1]?.key).toBe(partKey(quoteOfPart(knife)));
  });

  it('moves a comment whose words the writer changed to the whole stanza, quote kept', () => {
    const changed = { ...quoteOfPart(knife), text: 'the old words' };
    const groups = groupStanzaComments([commentOn('d', changed)], [knife]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.comments[0]?.quote?.text).toBe('the old words');
  });

  it('leaves out a part with no comments left', () => {
    expect(groupStanzaComments([commentOn('a', null)], [knife])).toHaveLength(1);
  });
});

describe('composerKey', () => {
  it('gives each set of words its own box, and one box while lines are ticked', () => {
    expect(composerKey(null, false)).toBe('whole');
    expect(composerKey(quoteOfPart(knife), true)).toBe('picking');
    expect(composerKey(quoteOfPart(knife), false)).toBe(partKey(quoteOfPart(knife)));
  });
});
