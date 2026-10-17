/**
 * Tests for the className helper used by shadcn/ui components (story S1-E1-01).
 */
import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('keeps only the last of two clashing Tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('leaves out classes whose condition is false', () => {
    const isSelected = false;
    expect(cn('rounded', isSelected && 'bg-black')).toBe('rounded');
  });
});
