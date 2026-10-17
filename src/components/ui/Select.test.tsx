/**
 * Tests for the one drop-down style (story S1-E1-03; DoD design rules, drop-downs).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Select } from './Select';

const options = [
  { value: 'device', label: 'Device' },
  { value: 'night', label: 'Night' },
];

describe('Select', () => {
  it('is a real drop-down named by its label, so keyboards and screen readers work as usual', () => {
    render(
      <Select
        id="theme"
        label="Theme"
        options={options}
        value="device"
        onChange={() => undefined}
      />,
    );

    const dropDown = screen.getByRole('combobox', { name: 'Theme' });
    expect(dropDown.tagName).toBe('SELECT');
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('passes the chosen value to its parent', () => {
    const handleChange = vi.fn();
    render(
      <Select id="theme" label="Theme" options={options} value="device" onChange={handleChange} />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Theme' }), {
      target: { value: 'night' },
    });

    expect(handleChange).toHaveBeenCalledWith('night');
  });

  it('is only as wide as its longest option, never stretched across the row', () => {
    render(
      <Select
        id="theme"
        label="Theme"
        options={options}
        value="device"
        onChange={() => undefined}
      />,
    );

    const dropDown = screen.getByRole('combobox', { name: 'Theme' });
    expect(dropDown).toHaveClass('w-auto', 'h-11', 'pr-9', 'border-control-border');
    expect(dropDown.parentElement).toHaveClass('w-fit');
  });
});
