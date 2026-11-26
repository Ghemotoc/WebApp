/**
 * The Publish panel's "This is the last chapter" in its three states (bundle CALM-6; design
 * handover "The last chapter", points 10 to 13), and the Publish dialog of board D06 (user story
 * 5.6): the chapter line, "Tell followers" with its number, Save draft and Later.
 */
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { ChapterLastState } from '../api/lastChapter';
import type { PublishingState } from '../hooks/useChapterPublishing';

import { PublishPanel } from './PublishPanel';

/** The mark's state for chapter 15 with nothing after it, unless a test says otherwise. */
function lastStateWith(changes: Partial<ChapterLastState> = {}): ChapterLastState {
  return {
    number: 15,
    isLast: false,
    canMark: true,
    markedNumber: null,
    originalIsLast: false,
    ...changes,
  };
}

/** What a test may change about the panel beyond its status and mark. */
interface PanelOptions {
  followersToTell?: number | null;
  onSaveDraft?: () => void;
  startsLater?: boolean;
}

/** The panel for a chapter in a status, with the action spied on. */
function renderPanel(
  status: PublishingState['status'],
  lastState: ChapterLastState | null,
  options: PanelOptions = {},
) {
  const onAction = vi.fn();
  const state: PublishingState = {
    status,
    scheduledFor: status === 'scheduled' ? new Date('2026-11-26T08:00:00Z') : null,
    lastPublishedAt: status === 'published' ? new Date('2026-11-20T08:00:00Z') : null,
  };
  renderWithProviders(
    <PublishPanel
      state={state}
      lastState={lastState}
      followersToTell={options.followersToTell ?? 1284}
      problem={null}
      isBusy={false}
      onAction={onAction}
      onPreview={() => undefined}
      onSaveDraft={options.onSaveDraft ?? (() => undefined)}
      startsLater={options.startsLater}
    />,
    'en',
  );
  return onAction;
}

/** The switch, by its name. */
function lastSwitch() {
  return screen.getByRole('switch', { name: 'This is the last chapter' });
}

describe('PublishPanel: the last chapter (CALM-6)', () => {
  it('a draft: the switch starts off, says what it does, and goes with the publish', () => {
    const onAction = renderPanel('draft', lastStateWith());
    expect(lastSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(lastSwitch()).toHaveAccessibleDescription(
      'Readers see “of 15”, and the story turns Completed when this chapter is out.',
    );
    fireEvent.click(lastSwitch());
    fireEvent.click(screen.getByRole('button', { name: 'Publish chapter 15' }));
    expect(onAction).toHaveBeenCalledWith({ kind: 'publish', asLast: true, tellFollowers: true });
  });

  it('a draft publishes without the mark while the switch stays off', () => {
    const onAction = renderPanel('draft', lastStateWith());
    fireEvent.click(screen.getByRole('button', { name: 'Publish chapter 15' }));
    expect(onAction).toHaveBeenCalledWith({ kind: 'publish', asLast: false, tellFollowers: true });
  });

  it('a draft in a later language edition starts on when its original is marked', () => {
    renderPanel('draft', lastStateWith({ originalIsLast: true }));
    expect(lastSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('a draft after a marked chapter says publishing it takes the mark off', () => {
    renderPanel('draft', lastStateWith({ markedNumber: 14 }));
    expect(
      screen.getByText(
        'Chapter 14 is marked as the last. Publishing this one takes that mark off.',
      ),
    ).toBeInTheDocument();
    // Board D06: and what happens to the story either way.
    expect(
      screen.getByText('The story goes back to Ongoing, and readers see “Chapter 15”.'),
    ).toBeInTheDocument();
    fireEvent.click(lastSwitch());
    expect(
      screen.getByText('Readers see “Chapter 15 of 15”, and the story stays Completed.'),
    ).toBeInTheDocument();
  });

  it('a draft with a later chapter already out shows no switch', () => {
    renderPanel('draft', lastStateWith({ canMark: false }));
    expect(screen.queryByRole('switch', { name: 'This is the last chapter' })).toBeNull();
  });

  it('a scheduled chapter: the switch changes the mark straight away', () => {
    const onAction = renderPanel('scheduled', lastStateWith({ isLast: true }));
    expect(lastSwitch()).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(lastSwitch());
    expect(onAction).toHaveBeenCalledWith({ kind: 'setLast', isLast: false });
  });

  it('the latest published chapter: the switch turns the mark on', () => {
    const onAction = renderPanel('published', lastStateWith());
    fireEvent.click(lastSwitch());
    expect(onAction).toHaveBeenCalledWith({ kind: 'setLast', isLast: true });
  });

  it('a published chapter holding the mark shows the plain line instead of the switch', () => {
    renderPanel('published', lastStateWith({ isLast: true }));
    expect(screen.getByText('This is the last chapter.')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'This is the last chapter' })).toBeNull();
  });
});

describe('PublishPanel: the Publish dialog (board D06)', () => {
  it('Tell followers starts on and says how many hear, as a number in the reader’s format', () => {
    renderPanel('draft', lastStateWith());
    const tellSwitch = screen.getByRole('switch', { name: 'Tell followers' });
    expect(tellSwitch).toHaveAttribute('aria-checked', 'true');
    expect(tellSwitch).toHaveAccessibleDescription(
      '1,284 followers get a notification when it goes out.',
    );
  });

  it('a writer with no followers is told nobody gets a notification', () => {
    renderPanel('draft', lastStateWith(), { followersToTell: 0 });
    expect(screen.getByRole('switch', { name: 'Tell followers' })).toHaveAccessibleDescription(
      'No followers yet, so nobody gets a notification.',
    );
  });

  it('with Tell followers off, the chapter goes out without telling anyone', () => {
    const onAction = renderPanel('draft', lastStateWith());
    fireEvent.click(screen.getByRole('switch', { name: 'Tell followers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish chapter 15' }));
    expect(onAction).toHaveBeenCalledWith({ kind: 'publish', asLast: false, tellFollowers: false });
  });

  it('Later shows the day and time, and scheduling keeps the choice', () => {
    const onAction = renderPanel('draft', lastStateWith());
    fireEvent.click(screen.getByRole('radio', { name: 'Later' }));
    expect(screen.getByLabelText('Day')).toBeInTheDocument();
    expect(screen.getByLabelText('Time, your local time')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Tell followers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Schedule chapter 15' }));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'schedule', tellFollowers: false }),
    );
  });

  it('opened from the Schedule item, it starts on Later', () => {
    renderPanel('draft', lastStateWith(), { startsLater: true });
    expect(screen.getByRole('radio', { name: 'Later' })).toBeChecked();
  });

  it('Save draft hands over to the editor', () => {
    const onSaveDraft = vi.fn();
    renderPanel('draft', lastStateWith(), { onSaveDraft });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(onSaveDraft).toHaveBeenCalledOnce();
  });

  it('a draft has nothing to unpublish, so its dialog shows no Unpublish', () => {
    renderPanel('draft', lastStateWith());
    expect(screen.queryByRole('button', { name: 'Unpublish chapter' })).toBeNull();
  });
});
