/**
 * Tests for the prompt ID that travels in the new-story address (bundle GAPS-12c): only a UUID
 * goes on to the database.
 */
import { describe, expect, it } from 'vitest';

import { promptIdFrom } from './hubPrompts';

describe('promptIdFrom', () => {
  it('keeps a UUID as it is', () => {
    expect(promptIdFrom('3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c')).toBe(
      '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c',
    );
  });

  it('answers null when the address has no prompt', () => {
    expect(promptIdFrom(null)).toBeNull();
  });

  it('answers null for anything that is not a UUID', () => {
    expect(promptIdFrom('')).toBeNull();
    expect(promptIdFrom('latest')).toBeNull();
    expect(promptIdFrom("3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c' or 1=1")).toBeNull();
  });
});
