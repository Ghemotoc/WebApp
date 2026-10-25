/**
 * Tests for remembering the reader's sort in this tab (story S1-E5-02, fourth criterion).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { rememberedSort, rememberSort } from './sortMemory';

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('sort memory', () => {
  it('keeps the sort the reader picked for the next list', () => {
    rememberSort('title_az');
    expect(rememberedSort()).toBe('title_az');
  });

  it('forgets it when the reader goes back to the list’s own order', () => {
    rememberSort('oldest');
    rememberSort(null);
    expect(rememberedSort()).toBeNull();
  });

  it('keeps working when the browser refuses storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => rememberSort('writer')).not.toThrow();
    expect(rememberedSort()).toBeNull();
  });
});
