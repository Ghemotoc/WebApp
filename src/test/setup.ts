/**
 * Runs before every unit and component test (story S1-E1-01).
 *
 * Who loads it: Vitest, through `test.setupFiles` in vite.config.ts.
 * What it adds: the jest-dom matchers (for example `toBeInTheDocument()`) and a clean page after
 * each test, so one test's screen never leaks into the next.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
