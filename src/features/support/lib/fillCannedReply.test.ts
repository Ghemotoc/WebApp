/**
 * Unit tests for filling a canned reply (story S1-E11-13, part 13b; bundle ADMIN-2h3b).
 */
import { describe, expect, it } from 'vitest';

import { fillCannedReply, withInsertedText } from './fillCannedReply';

const reply = {
  bodyRo: 'Bună, {{name}}! Cererea #{{number}}.',
  bodyEn: 'Hi {{ name }}! Request #{{number}}.',
};

describe('filling a canned reply', () => {
  it('uses the Romanian words and the person’s name for a Romanian ticket', () => {
    expect(fillCannedReply(reply, { number: 1042, language: 'ro', displayName: 'Ana' })).toBe(
      'Bună, Ana! Cererea #1042.',
    );
  });

  it('uses the English words for an English ticket', () => {
    expect(fillCannedReply(reply, { number: 7, language: 'en', displayName: 'inkwolf' })).toBe(
      'Hi inkwolf! Request #7.',
    );
  });

  it('drops the name, and the comma before it, for someone who wrote only by email', () => {
    expect(fillCannedReply(reply, { number: 7, language: 'en', displayName: null })).toBe(
      'Hi! Request #7.',
    );
    expect(fillCannedReply(reply, { number: 7, language: 'ro', displayName: null })).toBe(
      'Bună! Cererea #7.',
    );
  });

  it('leaves an unknown placeholder for staff to see', () => {
    expect(
      fillCannedReply(
        { bodyRo: '{{date}}', bodyEn: '{{date}}' },
        { number: 1, language: 'en', displayName: 'A' },
      ),
    ).toBe('{{date}}');
  });
});

describe('inserting into the reply box', () => {
  it('fills an empty box', () => {
    expect(withInsertedText('  ', 'Hello')).toBe('Hello');
  });

  it('keeps what staff already wrote and adds the reply after a blank line', () => {
    expect(withInsertedText('Thanks!\n', 'Hello')).toBe('Thanks!\n\nHello');
  });
});
