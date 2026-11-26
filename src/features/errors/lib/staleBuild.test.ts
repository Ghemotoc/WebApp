/**
 * Tests for lib/staleBuild.ts (BUGS thread, 26 Nov 2026): a page whose code belongs to an older
 * release reloads once by itself, and never loops.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  isStaleBuildError,
  reloadOnceForNewRelease,
  staleBuildReloadKey,
  staleBuildReloadWindowMs,
} from './staleBuild';

/** A small in-memory stand-in for the tab's session storage. */
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('isStaleBuildError', () => {
  it('spots the wording of Chrome, Firefox and Safari for a page file that failed to load', () => {
    expect(
      isStaleBuildError(
        new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js'),
      ),
    ).toBe(true);
    expect(isStaleBuildError(new TypeError('error loading dynamically imported module'))).toBe(
      true,
    );
    expect(isStaleBuildError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(
      isStaleBuildError(
        "Failed to load module script: 'text/html' is not a valid JavaScript MIME type.",
      ),
    ).toBe(true);
  });

  it('leaves every other error alone', () => {
    expect(isStaleBuildError(new TypeError('Cannot read properties of undefined'))).toBe(false);
    expect(isStaleBuildError(undefined)).toBe(false);
  });
});

describe('reloadOnceForNewRelease', () => {
  it('never reloads while the browser is offline, so the offline banner stays', () => {
    const reloadPage = vi.fn();
    const storage = memoryStorage();
    expect(reloadOnceForNewRelease(reloadPage, storage, 1_000_000, false)).toBe(false);
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('reloads the page the first time', () => {
    const reloadPage = vi.fn();
    const storage = memoryStorage();

    expect(reloadOnceForNewRelease(reloadPage, storage, 1_000_000)).toBe(true);
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(storage.getItem(staleBuildReloadKey)).toBe('1000000');
  });

  it('refuses a second reload straight after the first, so a broken page never loops', () => {
    const reloadPage = vi.fn();
    const storage = memoryStorage();
    reloadOnceForNewRelease(reloadPage, storage, 1_000_000);

    expect(reloadOnceForNewRelease(reloadPage, storage, 1_000_000 + 5_000)).toBe(false);
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('reloads again for a later release, once the window has passed', () => {
    const reloadPage = vi.fn();
    const storage = memoryStorage();
    reloadOnceForNewRelease(reloadPage, storage, 1_000_000);

    expect(
      reloadOnceForNewRelease(reloadPage, storage, 1_000_000 + staleBuildReloadWindowMs + 1),
    ).toBe(true);
    expect(reloadPage).toHaveBeenCalledTimes(2);
  });

  it('never reloads when the browser refuses session storage', () => {
    const reloadPage = vi.fn();

    expect(reloadOnceForNewRelease(reloadPage, null)).toBe(false);
    expect(reloadPage).not.toHaveBeenCalled();
  });
});
