/**
 * Tests for the one date and time field (bundle CALM-1c; rules doc "Defaults from the full-canvas
 * review", Times). The skipped-hour maths depends on the machine's zone, so it is replaced here
 * with a fixed answer: 02:30 on the spring night is the skipped hour, everything else is real.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DateTimeField } from './DateTimeField';

vi.mock('@/lib/local-time', () => ({
  skippedHourRunTime: (date: string, time: string) =>
    date === '2027-03-28' && time === '02:30' ? '03:30' : null,
}));

/** Draws the field with the given value and a spy for changes. */
function renderField(value: { date: string; time: string }) {
  const handleChange = vi.fn();
  render(
    <DateTimeField
      id="when"
      value={value}
      onChange={handleChange}
      dateLabel="Date"
      timeLabel="Time"
      note="Local time."
      skippedHourNote={(runTime) => `It will run at ${runTime}.`}
    />,
  );
  return handleChange;
}

describe('DateTimeField', () => {
  it('labels the date and the time boxes and shows the note', () => {
    renderField({ date: '2027-01-10', time: '18:00' });

    expect(screen.getByLabelText('Date')).toHaveValue('2027-01-10');
    expect(screen.getByLabelText('Time')).toHaveValue('18:00');
    expect(screen.getByText('Local time.')).toBeInTheDocument();
  });

  it('passes a new time up with the date it already had', () => {
    const handleChange = renderField({ date: '2027-01-10', time: '18:00' });

    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '19:15' } });

    expect(handleChange).toHaveBeenCalledWith({ date: '2027-01-10', time: '19:15' });
  });

  it('says quietly when a time falls in the hour the clocks skip', () => {
    renderField({ date: '2027-03-28', time: '02:30' });

    expect(screen.getByRole('status')).toHaveTextContent('It will run at 03:30.');
  });

  it('shows no skipped-hour note for an ordinary time', () => {
    renderField({ date: '2027-03-28', time: '10:00' });

    expect(screen.queryByRole('status')).toBeNull();
  });
});
