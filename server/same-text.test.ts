/** Unit tests for the constant-time comparison (QA-1d, finding X3). */
import { describe, expect, it } from 'vitest';

import { sameText } from './same-text';

describe('sameText', () => {
  it('says two equal texts match', () => {
    expect(sameText('v1,abc=', 'v1,abc=')).toBe(true);
  });

  it('says texts that differ anywhere, or in length, do not match', () => {
    expect(sameText('v1,abd=', 'v1,abc=')).toBe(false);
    expect(sameText('x1,abc=', 'v1,abc=')).toBe(false);
    expect(sameText('v1,abc', 'v1,abc=')).toBe(false);
    expect(sameText('', 'v1,abc=')).toBe(false);
  });
});
