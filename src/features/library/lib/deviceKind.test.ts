/**
 * Tests for the kind of screen a reading place is saved on (story S1-E4-03).
 */
import { describe, expect, it } from 'vitest';

import { deviceKindFor } from './deviceKind';

describe('deviceKindFor', () => {
  it('calls a 390 px window a phone, 768 px a tablet and 1440 px a computer', () => {
    expect(deviceKindFor(390)).toBe('phone');
    expect(deviceKindFor(767)).toBe('phone');
    expect(deviceKindFor(768)).toBe('tablet');
    expect(deviceKindFor(1099)).toBe('tablet');
    expect(deviceKindFor(1440)).toBe('computer');
  });
});
