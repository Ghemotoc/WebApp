/**
 * The line in place of the comment box while the writer has paused new comments, and the
 * writer's "Resume now" (bundle CALM-8; IDEA-20261109-8; the design handover's Step 4, points 5,
 * 6 and 8).
 */
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { pinViewerTimeZone } from '@/test/viewerTimeZone';

import { useResumeComments, type ResumeFailure } from '../hooks/useResumeComments';

import { CommentsPausedLine } from './CommentsPausedLine';

vi.mock('../hooks/useResumeComments', () => ({ useResumeComments: vi.fn() }));

const resume = vi.fn();
const address = { storySlug: 'statia-meteo-seed01', chapterCode: 'reace001' };
// Saturday 21 November 2026, 17:40 in Stockholm, where these tests' reader is.
const end = new Date('2026-11-21T16:40:00Z');

/**
 * Sets what "Resume now" reports.
 *
 * @param failure - the last failure, or null
 * @param isResuming - true while the call runs
 */
function resumeReports(failure: ResumeFailure | null, isResuming = false) {
  vi.mocked(useResumeComments).mockReturnValue({ resume, isResuming, failure });
}

describe('CommentsPausedLine', () => {
  // The end shows in the reader's own time (CALM-8b), not Romania time.
  pinViewerTimeZone('Europe/Stockholm');

  beforeEach(() => {
    resume.mockReset();
    resumeReports(null);
  });

  it('tells a reader until when new comments are paused, in their own time, with no button', () => {
    renderWithProviders(<CommentsPausedLine address={address} end={end} canResume={false} />, 'en');
    expect(
      screen.getByText('New comments are paused until Saturday 21 November, 17:40.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('speaks Romanian with the date written the Romanian way', () => {
    renderWithProviders(<CommentsPausedLine address={address} end={end} canResume={false} />, 'ro');
    expect(
      screen.getByText('Comentariile noi sunt oprite până sâmbătă, 21 noiembrie, 17:40.'),
    ).toBeInTheDocument();
  });

  it('gives the writer "Resume now", which ends the pause', () => {
    renderWithProviders(<CommentsPausedLine address={address} end={end} canResume />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Resume now' }));
    expect(resume).toHaveBeenCalledTimes(1);
    expect(useResumeComments).toHaveBeenCalledWith(address, undefined);
  });

  it('hands "Resume now" the parent’s callback, so the box that comes back can take the focus', () => {
    const onResumed = vi.fn();
    renderWithProviders(
      <CommentsPausedLine address={address} end={end} canResume onResumed={onResumed} />,
      'en',
    );
    expect(useResumeComments).toHaveBeenCalledWith(address, onResumed);
  });

  it('says so in Romanian too', () => {
    renderWithProviders(<CommentsPausedLine address={address} end={end} canResume />, 'ro');
    expect(screen.getByRole('button', { name: 'Pornește-le acum' })).toBeInTheDocument();
  });

  it('says plainly when the comments could not be opened again', () => {
    resumeReports('other');
    renderWithProviders(<CommentsPausedLine address={address} end={end} canResume />, 'en');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We couldn’t open comments again. Check your connection and try again.',
    );
  });

  it('says why when the account can’t change its stories now', () => {
    resumeReports('not_active');
    renderWithProviders(<CommentsPausedLine address={address} end={end} canResume />, 'en');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This account can’t change its stories right now.',
    );
  });
});
