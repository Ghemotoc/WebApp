/**
 * Reply under a comment, and what a pause of new comments leaves alone (bundle CALM-8;
 * IDEA-20261109-8; the design handover's Step 4, point 7: "Reply is hidden while paused. Like,
 * reactions, Report and More stay."). The meta line, "On paragraph 3" and the arrow-only Downvote
 * (BOOKS B05, user story 2.5, board B05-ReaderEnd).
 */
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSession } from '@/features/auth/hooks/useSession';
import {
  ParagraphCommentsContext,
  type ParagraphComments,
} from '@/features/reading/lib/paragraphCommentsContext';
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
  quote: null,
};

/**
 * Draws the comment inside a router, as the author's name links to their profile.
 *
 * @param isPaused - true while the writer has paused new comments
 * @param shown - the comment to draw (the plain one when left out)
 */
function renderComment(isPaused: boolean, shown: ChapterComment = comment) {
  renderWithProviders(
    <MemoryRouter>
      <CommentItem address={address} comment={shown} isPaused={isPaused} />
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

  it('says Writer in words in the meta line, with no pill', () => {
    renderComment(false, { ...comment, isWriter: true });
    const writer = screen.getByText('Writer');
    expect(writer.tagName).toBe('LI');
    expect(writer.className).toContain('font-semibold');
  });

  it('opens the paragraph a comment is on from "On paragraph 3" in the reader', () => {
    const setOpenPlace = vi.fn();
    const paragraphs = { setOpenPlace } as unknown as ParagraphComments;
    renderWithProviders(
      <MemoryRouter>
        <ParagraphCommentsContext.Provider value={paragraphs}>
          <CommentItem address={address} comment={{ ...comment, paragraph: 3 }} />
        </ParagraphCommentsContext.Provider>
      </MemoryRouter>,
      'en',
    );
    fireEvent.click(screen.getByRole('button', { name: 'On paragraph 3' }));
    expect(setOpenPlace).toHaveBeenCalledWith(3);
  });

  it('shows "On paragraph 3" as words outside the reader', () => {
    renderComment(false, { ...comment, paragraph: 3 });
    expect(screen.getByText('On paragraph 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'On paragraph 3' })).toBeNull();
  });

  it('downvotes from an arrow-only button named for the comment', () => {
    const setDownvoted = vi.fn();
    vi.mocked(useDownvoteComment).mockReturnValue({ setDownvoted, isSaving: false, failure: null });
    renderComment(false);
    const downvote = screen.getByRole('button', { name: /^Downvote/ });
    expect(downvote).toHaveAttribute('aria-pressed', 'false');
    expect(downvote.textContent).toBe('');
    fireEvent.click(downvote);
    expect(setDownvoted).toHaveBeenCalledWith(true);
  });
});
