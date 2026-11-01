/** Tests for the size line of Download my data (story S1-E13-02). */
import { describe, expect, it } from 'vitest';

import { fileSizeText } from './fileSize';

describe('fileSizeText', () => {
  it('writes a small file in kilobytes, never as 0', () => {
    expect(fileSizeText(120, 'en')).toBe('1 kB');
    expect(fileSizeText(840_000, 'en')).toBe('840 kB');
  });

  it('writes a big file in megabytes with one decimal, the way each language writes numbers', () => {
    expect(fileSizeText(2_400_000, 'en')).toBe('2.4 MB');
    expect(fileSizeText(2_400_000, 'ro')).toBe('2,4 MB');
  });
});
