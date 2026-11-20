/**
 * The comments under a chapter while the writer has paused new comments, and after "Resume now"
 * (bundle CALM-8; IDEA-20261109-8; the design handover's Step 4, points 5 and 8): the comment box
 * comes back where the line was and takes the focus, so a keyboard or screen reader user isn't left
 * on a button that has gone (WCAG 2.2, 2.4.3).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/AppProviders';
import { useSession } from '@/features/auth/hooks/useSession';
import { createI18n } from '@/lib/i18n';
import { pinViewerTimeZone } from '@/test/viewerTimeZone';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { CommentsPage } from '../api/comments';
import { useChapterComments } from '../hooks/useChapterComments';
import { useCommentComposer, type CommentComposerState } from '../hooks/useCommentComposer';
import { useCommentLimit } from '../hooks/useCommentLimit';
import { useResumeComments } from '../hooks/useResumeComments';

import { CommentsSection } from './CommentsSection';

vi.mock('@/features/auth/hooks/useSession', () => ({ useSession: vi.fn() }));
vi.mock('../hooks/useChapterComments', () => ({ useChapterComments: vi.fn() }));
vi.mock('../hooks/useResumeComments', () => ({ useResumeComments: vi.fn() }));
vi.mock('../hooks/useCommentComposer', () => ({ useCommentComposer: vi.fn() }));
vi.mock('../hooks/useCommentLimit', () => ({ useCommentLimit: vi.fn() }));

const address = { storySlug: 'statia-meteo-seed01', chapterCode: 'reace001' };
// Saturday 21 November 2026, 17:40 in Stockholm, where these tests' reader is: a pause that is still running in these tests.
const pauseEnd = '2026-11-21T16:40:00Z';

/**
 * Sets what the chapter's comment list answers.
 *
 * @param pausedUntil - when the writer's pause ends, or null when none runs
 */
function commentsAnswer(pausedUntil: string | null) {
  const firstPage: CommentsPage = {
    commentsEnabled: true,
    audienceAllowsMe: true,
    pause: { pausedUntil, canResume: true },
    total: 0,
    hasMore: false,
    comments: [],
  };
  vi.mocked(useChapterComments).mockReturnValue({
    firstPage,
    comments: [],
    hasMore: false,
    showMore: vi.fn(),
    isLoadingMore: false,
    loadFailed: false,
  });
}

/** A comment box with nothing typed, so the real form renders without a database. */
function emptyComposer(): CommentComposerState {
  return {
    text: '',
    isSpoiler: false,
    setIsSpoiler: vi.fn(),
    justPosted: false,
    posting: { isPosting: false, failure: null },
    rules: { isShown: false },
    isNudgeShown: false,
    isDetailsNoteShown: false,
    setText: vi.fn(),
    send: vi.fn(),
    sendAnyway: vi.fn(),
    postWithDetails: vi.fn(),
    editAgain: vi.fn(),
  } as unknown as CommentComposerState;
}

describe('CommentsSection during a pause of new comments', () => {
  // The end shows in the reader's own time (CALM-8b); this reader is in Stockholm.
  pinViewerTimeZone('Europe/Stockholm');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T16:40:00Z'));
    vi.mocked(useSession).mockReturnValue({ userId: 'writer' } as ReturnType<typeof useSession>);
    vi.mocked(useCommentComposer).mockReturnValue(emptyComposer());
    vi.mocked(useCommentLimit).mockReturnValue(3000);
    // "Resume now" works at once: the hook reports it the way it does once the database said ok.
    vi.mocked(useResumeComments).mockImplementation((_address, onResumed) => ({
      resume: () => onResumed?.(),
      isResuming: false,
      failure: null,
    }));
    return () => vi.useRealTimers();
  });

  it('shows the paused line in place of the comment box', () => {
    commentsAnswer(pauseEnd);
    renderWithProviders(<CommentsSection address={address} />, 'en');
    expect(
      screen.getByText('New comments are paused until Saturday 21 November, 17:40.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('puts the focus in the comment box that comes back after "Resume now"', () => {
    commentsAnswer(pauseEnd);
    // One set of providers for both draws, so the section keeps what it remembers in between.
    const i18n = createI18n('en');
    const section = () => (
      <AppProviders i18n={i18n}>
        <CommentsSection address={address} />
      </AppProviders>
    );
    const view = render(section());
    fireEvent.click(screen.getByRole('button', { name: 'Resume now' }));
    // The lists are read again and say no pause runs: the box comes back where the line was.
    commentsAnswer(null);
    view.rerender(section());
    expect(screen.getByRole('textbox', { name: 'Add a comment' })).toHaveFocus();
  });

  it('leaves the focus alone when the box is simply there, with no pause ended', () => {
    commentsAnswer(null);
    renderWithProviders(<CommentsSection address={address} />, 'en');
    expect(screen.getByRole('textbox', { name: 'Add a comment' })).not.toHaveFocus();
  });
});
