/**
 * Reply under a comment, and what a pause of new comments leaves alone (bundle CALM-8;
 * IDEA-20261109-8; the design handover's Step 4, point 7: "Reply is hidden while paused. Like,
 * reactions, Report and More stay.").
 */
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSession } from '@/features/auth/hooks/useSession';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { ChapterComment } from '../api/comments';
import { useDownvoteComment } from '../hooks/useDownvoteComment';
import { useReactToComment } from '../hooks/useReactToComment';

import { CommentItem } from './CommentItem';

vi.mock('@/features/auth/hooks/useSession', () => ({ useSession: vi.fn() }));
vi.mock('@/features/avatars/components/PersonAvatar', () => ({ PersonAvatar: () => null }));
vi.mock('../hooks/useReactToComment', () => ({ useReactToComment: vi.fn() }));
vi.mock('../hooks/useDownvoteComment', () => ({ useDownvoteComment: vi.fn() }));

const address = { storySlug: 'statia-meteo-seed01', chapterCode: 'reace001' };

/** Someone else's live comment with one heart. */
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
  reactions: { counts: { heart: 1 }, mine: null },
  isDownvotedByMe: false,
  replies: [],
  paragraph: null,
};

/**
 * Draws the comment inside a router, as the author's name links to their profile.
 *
 * @param isPaused - true while the writer has paused new comments
 */
function renderComment(isPaused: boolean) {
  renderWithProviders(
    <MemoryRouter>
      <CommentItem address={address} comment={comment} isPaused={isPaused} />
    </MemoryRouter>,
    'en',
  );
}

describe('CommentItem', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ userId: 'reader' } as ReturnType<typeof useSession>);
    vi.mocked(useReactToComment).mockReturnValue({
      react: vi.fn(),
      isReacting: false,
      failure: null,
    });
    vi.mocked(useDownvoteComment).mockReturnValue({
      setDownvoted: vi.fn(),
      isSaving: false,
      failure: null,
    });
  });

  it('offers Reply while comments are open, and Reply opens the reply box', () => {
    renderComment(false);
    fireEvent.click(screen.getByRole('button', { name: /^Reply/ }));
    expect(screen.getByLabelText('Reply to teacher')).toBeInTheDocument();
  });

  it('hides Reply while new comments are paused, and keeps reactions and Report', () => {
    renderComment(true);
    expect(screen.queryByRole('button', { name: /^Reply/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Heart, 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report/ })).toBeInTheDocument();
  });
});
