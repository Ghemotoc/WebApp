/**
 * Tests for the water-bubble segmented control (bundle G3 COMPONENTS; handoff "Segmented
 * control": a radio group, arrow keys move, Space picks).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './SegmentedControl';

/** Three modes, as Settings › Appearance shows them. */
const modes = [
  { value: 'light', label: 'Light' },
  { value: 'night', label: 'Night' },
  { value: 'device', label: 'Match the device' },
] as const;

describe('SegmentedControl', () => {
  it('is a named group of radio buttons with the picked one checked and bold', () => {
    render(
      <SegmentedControl
        legend="Mode"
        name="mode"
        options={modes}
        value="night"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    const night = screen.getByRole('radio', { name: 'Night' });
    expect(night).toBeChecked();
    expect(night.closest('label')).toHaveClass('font-bold');
    expect(screen.getByRole('radio', { name: 'Light' }).closest('label')).toHaveClass(
      'font-medium',
    );
  });

  it('reports the segment a person picks', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        legend="Mode"
        name="mode"
        options={modes}
        value="light"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Match the device' }));
    expect(onChange).toHaveBeenCalledWith('device');
  });

  it('can hide its legend from sight while screen readers still hear it', () => {
    render(
      <SegmentedControl
        legend="Mode"
        isLegendVisible={false}
        name="mode"
        options={modes}
        value="light"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText('Mode')).toHaveClass('sr-only');
  });
});
