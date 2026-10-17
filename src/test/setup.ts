/**
 * Runs before every unit and component test (story S1-E1-01).
 *
 * Who loads it: Vitest, through `test.setupFiles` in vite.config.ts.
 * What it adds: the jest-dom matchers (for example `toBeInTheDocument()`), a clean page after
 * each test so one test's screen never leaks into the next, and a matchMedia stand-in (S1-E1-03).
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom has no matchMedia; the theme code asks it whether the device is in dark mode.
// This stand-in always answers "light" and ignores listeners.
if (typeof window !== 'undefined' && window.matchMedia === undefined) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
