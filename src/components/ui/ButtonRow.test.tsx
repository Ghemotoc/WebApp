/**
 * Tests for ButtonRow (design books item 8): the footer is left-aligned and keeps the order given.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ButtonRow } from './ButtonRow';

describe('ButtonRow', () => {
  it('puts the buttons on the left, never at the right edge', () => {
    render(
      <ButtonRow>
        <button type="button">Save</button>
        <button type="button">Cancel</button>
      </ButtonRow>,
    );
    const row = screen.getByRole('button', { name: 'Save' }).parentElement;
    expect(row?.className).not.toContain('justify-end');
    expect(row?.className).toContain('flex-wrap');
  });

  it('keeps the main button first, in reading order', () => {
    render(
      <ButtonRow>
        <button type="button">Save</button>
        <button type="button">Cancel</button>
      </ButtonRow>,
    );
    const names = screen.getAllByRole('button').map((button) => button.textContent);
    expect(names).toEqual(['Save', 'Cancel']);
  });
});
