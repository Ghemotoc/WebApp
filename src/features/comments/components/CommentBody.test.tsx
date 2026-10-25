/**
 * What a comment's place shows (story S1-E6-01): spoilers behind "Show spoiler" (criterion 2),
 * the moderation and deletion markers, and safe links in the words (CLAUDE.md rule 8).
 */
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { ChapterComment } from '../api/comments';

import { CommentBody } from './CommentBody';

/** A live comment by teacher; each test changes what it needs. */
function commentWith(changes: Partial<ChapterComment>): ChapterComment {
  return {
    id: 'c1',
    author: { handle: 'teacher', displayName: 'teacher' },
    isWriter: false,
    isMine: false,
    createdAt: '2026-10-24T10:00:00Z',
    isSpoiler: false,
    state: 'live',
    body: 'Am pus telefonul jos.',
    canDelete: false,
    reactions: { counts: {}, mine: null },
    isDownvotedByMe: false,
    replies: [],
    ...changes,
  };
}

describe('a comment’s words', () => {
  it('hides a spoiler until the reader presses “Show spoiler”', () => {
    renderWithProviders(
      <CommentBody comment={commentWith({ isSpoiler: true, body: 'Cine era în lift.' })} />,
      'en',
    );
    expect(screen.queryByText('Cine era în lift.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show spoiler' }));
    expect(screen.getByText('Cine era în lift.')).toBeInTheDocument();
  });

  it('shows the moderation marker in place of a removed comment', () => {
    renderWithProviders(
      <CommentBody comment={commentWith({ state: 'removed', body: null })} />,
      'en',
    );
    expect(screen.getByText('[Removed by the moderation team]')).toBeInTheDocument();
  });

  it('says “Comment deleted.” where a deleted comment keeps its replies', () => {
    renderWithProviders(
      <CommentBody comment={commentWith({ state: 'deleted', body: null })} />,
      'en',
    );
    expect(screen.getByText('Comment deleted.')).toBeInTheDocument();
  });

  it('tells the author their own comment is hidden by moderation', () => {
    renderWithProviders(
      <CommentBody comment={commentWith({ state: 'hidden', isMine: true })} />,
      'en',
    );
    expect(screen.getByText('Am pus telefonul jos.')).toBeInTheDocument();
    expect(screen.getByText(/Only you can see it/)).toBeInTheDocument();
  });

  it('gives links rel="nofollow ugc noopener" and drops script links and HTML', () => {
    const body = 'See [the map](https://example.org) and [this](javascript:alert(1)) <b>bold</b>';
    const { container } = renderWithProviders(
      <CommentBody comment={commentWith({ body })} />,
      'en',
    );
    const link = screen.getByRole('link', { name: 'the map' });
    expect(link).toHaveAttribute('rel', 'nofollow ugc noopener');
    expect(screen.queryByRole('link', { name: 'this' })).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });
});
