/**
 * Unit tests for StaffBrowserBars (bundle CALM-1): a phone's bars take the staff area's page
 * colour while the staff frame is on screen and the member's colour once it has gone.
 * Who runs it: `npm test` (Vitest, jsdom). A small style sheet stands in for tokens.css.
 */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StaffBrowserBars } from './StaffBrowserBars';

/** The two page colours from src/styles/tokens.css that this test uses. */
const memberDay = '#f4f0ec';
const staffDay = '#f3ece0';

let added: HTMLElement[] = [];

beforeEach(() => {
  // The stand-in for tokens.css and the theme-color meta index.html starts with.
  const style = document.createElement('style');
  style.textContent = `:root { --paper: ${memberDay}; } [data-area='staff'] { --paper: ${staffDay}; }`;
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = memberDay;
  document.head.append(style, meta);
  added = [style, meta];
});

afterEach(() => {
  added.forEach((element) => {
    element.remove();
  });
});

/** @returns the colour the theme-color meta names now */
function barColour(): string | null {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null;
}

describe('StaffBrowserBars', () => {
  it("gives the bars the staff area's beige while the frame is on screen, the member's after", () => {
    const view = render(
      <div data-area="staff">
        <StaffBrowserBars />
      </div>,
    );
    expect(barColour()).toBe(staffDay);
    view.unmount();
    expect(barColour()).toBe(memberDay);
  });
});
