/**
 * "Pause new comments" in Story settings: the switch's states (bundle CALM-8; IDEA-20261109-8;
 * the design handover's Step 4, points 1 to 3).
 */
import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommentPauseChoice } from '@/schemas/story';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CommentPauseField } from './CommentPauseField';

/** The field with its answer kept, as the settings form keeps it. */
function FieldWithAnswer({ pausedUntil }: { pausedUntil: string | null }) {
  const [answer, setAnswer] = useState<CommentPauseChoice | null>(null);
  return (
    <>
      <CommentPauseField answer={answer} pausedUntil={pausedUntil} onChange={setAnswer} />
      <output data-testid="answer">{answer ?? 'as saved'}</output>
    </>
  );
}

/** The switch, found by its label. */
function pauseSwitch() {
  return screen.getByRole('switch', { name: 'Pause new comments' });
}

beforeEach(() => {
  // Friday 20 November 2026, 18:40 in Bucharest. Only the clock is faked, so clicks still work.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T16:40:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CommentPauseField', () => {
  it('is off by default and says what a pause leaves alone', () => {
    renderWithProviders(<FieldWithAnswer pausedUntil={null} />, 'en');
    expect(pauseSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(pauseSwitch()).toHaveAccessibleDescription(
      'Comments already posted stay, and reporting still works.',
    );
    expect(screen.queryByRole('group', { name: 'For how long' })).toBeNull();
  });

  it('turned on, asks for how long with 24 hours chosen and names the end in Romania time', () => {
    renderWithProviders(<FieldWithAnswer pausedUntil={null} />, 'en');
    fireEvent.click(pauseSwitch());
    expect(pauseSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '24 hours' })).toBeChecked();
    expect(pauseSwitch()).toHaveAccessibleDescription(
      'Paused until Saturday 21 November, 18:40, Romania time.',
    );
    expect(screen.getByTestId('answer')).toHaveTextContent('24h');
  });

  it('picking 7 days moves the end and the answer the form saves', () => {
    renderWithProviders(<FieldWithAnswer pausedUntil={null} />, 'en');
    fireEvent.click(pauseSwitch());
    fireEvent.click(screen.getByRole('radio', { name: '7 days' }));
    expect(pauseSwitch()).toHaveAccessibleDescription(
      'Paused until Friday 27 November, 18:40, Romania time.',
    );
    expect(screen.getByTestId('answer')).toHaveTextContent('7d');
  });

  it('turned off again before saving, asks for nothing', () => {
    renderWithProviders(<FieldWithAnswer pausedUntil={null} />, 'en');
    fireEvent.click(pauseSwitch());
    fireEvent.click(pauseSwitch());
    expect(pauseSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('answer')).toHaveTextContent('as saved');
  });

  it('while a pause runs, is on and names its end, and turning it off ends it on save', () => {
    renderWithProviders(<FieldWithAnswer pausedUntil="2026-11-23T10:15:00Z" />, 'en');
    expect(pauseSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(pauseSwitch()).toHaveAccessibleDescription(
      'Paused until Monday 23 November, 12:15, Romania time.',
    );
    expect(screen.queryByRole('group', { name: 'For how long' })).toBeNull();
    fireEvent.click(pauseSwitch());
    expect(pauseSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('answer')).toHaveTextContent('off');
  });

  it('shows a pause that has ended as off', () => {
    renderWithProviders(<FieldWithAnswer pausedUntil="2026-11-20T16:35:00Z" />, 'en');
    expect(pauseSwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('speaks Romanian with the dates written the Romanian way', () => {
    renderWithProviders(<FieldWithAnswer pausedUntil={null} />, 'ro');
    fireEvent.click(screen.getByRole('switch', { name: 'Oprește comentariile noi' }));
    expect(screen.getByRole('radio', { name: '24 de ore' })).toBeChecked();
    expect(
      screen.getByRole('switch', { name: 'Oprește comentariile noi' }),
    ).toHaveAccessibleDescription('Oprite până sâmbătă, 21 noiembrie, 18:40, ora României.');
  });
});
