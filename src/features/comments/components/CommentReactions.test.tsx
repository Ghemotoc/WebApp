/**
 * The reaction chips under a comment (story S1-E6-02): the reader's own is marked by a tick and
 * aria-pressed, not colour alone, picking it again takes it away, and a visitor sees the counts
 * without buttons.
 */
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSession } from '@/features/auth/hooks/useSession';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { ChapterComment } from '../api/comments';
import { useReactToComment } from '../hooks/useReactToComment';

import { CommentReactions } from './CommentReactions';

vi.mock('@/features/auth/hooks/useSession', () => ({ useSession: vi.fn() }));
vi.mock('../hooks/useReactToComment', () => ({ useReactToComment: vi.fn() }));

const react = vi.fn();
const address = { storySlug: 'statia-meteo-seed01', chapterCode: 'reace001' };

/** A live comment with four hearts (one the reader's) and one wow. */
const comment: ChapterComment = {
  id: 'c1',
  author: { handle: 'teacher', displayName: 'teacher' },
  isWriter: false,
  isMine: false,
  createdAt: '2026-10-24T10:00:00Z',
  isSpoiler: false,
  state: 'live',
  body: 'Ce final!',
  canDelete: false,
  reactions: { counts: { heart: 4, wow: 1 }, mine: 'heart' },
  isDownvotedByMe: false,
  replies: [],
  paragraph: null,
};

/** Signs the test reader in (a user ID) or out (null). */
function signedIn(userId: string | null) {
  vi.mocked(useSession).mockReturnValue({ userId } as ReturnType<typeof useSession>);
}

describe('reactions on a comment', () => {
  beforeEach(() => {
    react.mockReset();
    vi.mocked(useReactToComment).mockReturnValue({ react, isReacting: false, failure: null });
  });

  it('marks the reader’s own reaction with aria-pressed and its name', () => {
    signedIn('reader');
    renderWithProviders(<CommentReactions address={address} comment={comment} />, 'en');
    expect(screen.getByRole('button', { name: 'Heart, 4, reacted by you' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Wow, 1' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('takes the reaction away when the reader picks their own again', () => {
    signedIn('reader');
    renderWithProviders(<CommentReactions address={address} comment={comment} />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Heart, 4, reacted by you' }));
    expect(react).toHaveBeenCalledWith(null);
    fireEvent.click(screen.getByRole('button', { name: 'Wow, 1' }));
    expect(react).toHaveBeenCalledWith('wow');
  });

  it('shows a visitor the counts, with no way to react', () => {
    signedIn(null);
    const visitorsView = { ...comment, reactions: { ...comment.reactions, mine: null } };
    renderWithProviders(<CommentReactions address={address} comment={visitorsView} />, 'en');
    expect(screen.getByText('Heart, 4')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows nothing on a deleted comment’s marker', () => {
    signedIn('reader');
    renderWithProviders(
      <CommentReactions address={address} comment={{ ...comment, state: 'deleted' }} />,
      'en',
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
