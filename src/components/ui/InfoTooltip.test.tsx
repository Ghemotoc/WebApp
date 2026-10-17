/**
 * Tests for the tooltip pattern (Definition of Done; WCAG 2.2, 1.4.13; story S1-E2-02).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InfoTooltip } from './InfoTooltip';

/** A field described by the tooltip, as the sign-up form uses it. */
function renderWithField() {
  render(
    <>
      <input aria-label="Year" aria-describedby="why-year" />
      <InfoTooltip
        tooltipId="why-year"
        buttonLabel="Why we ask"
        text="To pick the right safety settings."
      />
    </>,
  );
}

describe('InfoTooltip', () => {
  it('opens on keyboard focus and closes with Escape without moving focus', () => {
    renderWithField();
    const button = screen.getByRole('button', { name: 'Why we ask' });
    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toBeVisible();
    button.focus();
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('opens on hover and on tap', () => {
    renderWithField();
    const button = screen.getByRole('button', { name: 'Why we ask' });
    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toBeVisible();
    fireEvent.mouseLeave(button);
    fireEvent.mouseEnter(screen.getByRole('tooltip', { hidden: true }));
    expect(screen.getByRole('tooltip')).toBeVisible();
    fireEvent.mouseLeave(screen.getByRole('tooltip'));
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeVisible();
  });

  it('describes its field even while closed, so screen readers hear it with the field', () => {
    renderWithField();
    expect(screen.getByRole('textbox', { name: 'Year' })).toHaveAccessibleDescription(
      'To pick the right safety settings.',
    );
  });
});
