/**
 * Tests for CommentText's reading size (design books item 11, Robert, approved 23 Nov 2026):
 * a long comment is set in type-long, a short one keeps type-body.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CommentText } from './CommentText';

describe('CommentText', () => {
  it('a short comment keeps the interface size', () => {
    render(<CommentText text="Lovely chapter." />);
    const words = screen.getByText('Lovely chapter.');
    expect(words.closest('.type-body')).not.toBeNull();
    expect(words.closest('.type-long')).toBeNull();
  });

  it('a long comment gets the bigger reading size', () => {
    const longText = 'The storm scene stayed with me all day. '.repeat(8).trim();
    render(<CommentText text={longText} />);
    const words = screen.getByText(longText);
    expect(words.closest('.type-long')).not.toBeNull();
  });
});
