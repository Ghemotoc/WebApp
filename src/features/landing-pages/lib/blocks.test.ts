/**
 * Unit tests for editing a landing page's blocks (story S1-E11-14; bundle CONTESTS-13a1).
 */
import { describe, expect, it } from 'vitest';

import type { LandingContent } from '@/schemas/landingPages';

import {
  addBlock,
  addQuestion,
  canMove,
  moveBlock,
  newBlock,
  questionsOf,
  removeBlock,
  removeQuestion,
  withQuestionPart,
  withWords,
  wordsOf,
} from './blocks';

/** A page with a hero, a text block and a prize block. */
function threeBlocks(): LandingContent {
  return {
    theme: 'plum',
    blocks: [newBlock('hero', 'a'), newBlock('text', 'b'), newBlock('prize', 'c')],
  };
}

describe('editing landing page blocks', () => {
  it('a new block has every text field empty in both languages', () => {
    const rules = newBlock('rules', 'x');
    expect(rules.ro).toEqual({ heading: '', body: '', link_label: '' });
    expect(rules.en).toEqual({ heading: '', body: '', link_label: '' });
    expect(rules.link).toBe('');
  });

  it('new key dates and questions start with their shared fields', () => {
    expect(newBlock('key_dates', 'x').dates).toEqual({
      entries_open: '',
      entries_close: '',
      results: '',
    });
    expect(newBlock('questions', 'x').ro.items).toEqual([{ question: '', answer: '' }]);
  });

  it('moves a block down and back up', () => {
    const moved = moveBlock(threeBlocks(), 1, 1);
    expect(moved.blocks.map((block) => block.id)).toEqual(['a', 'c', 'b']);
    expect(moveBlock(moved, 2, -1).blocks.map((block) => block.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the hero first: it never moves and nothing moves above it', () => {
    const content = threeBlocks();
    expect(canMove(content, 0, 1)).toBe(false);
    expect(canMove(content, 1, -1)).toBe(false);
    expect(moveBlock(content, 1, -1)).toBe(content);
  });

  it('doesn’t move past either end', () => {
    expect(canMove(threeBlocks(), 2, 1)).toBe(false);
  });

  it('adds a hero at the top and anything else at the end', () => {
    const withoutHero = removeBlock(threeBlocks(), 0);
    expect(addBlock(withoutHero, newBlock('hero', 'h')).blocks[0]?.id).toBe('h');
    expect(addBlock(threeBlocks(), newBlock('rules', 'r')).blocks.at(-1)?.id).toBe('r');
  });

  it('changes one language’s words and leaves the other alone', () => {
    const hero = withWords(newBlock('hero', 'a'), 'ro', 'title', 'Concursul de toamnă');
    expect(wordsOf(hero, 'ro', 'title')).toBe('Concursul de toamnă');
    expect(wordsOf(hero, 'en', 'title')).toBe('');
  });

  it('adding and removing a question keeps both languages the same length', () => {
    const block = addQuestion(newBlock('questions', 'q'));
    expect(questionsOf(block, 'ro')).toHaveLength(2);
    expect(questionsOf(block, 'en')).toHaveLength(2);
    const fewer = removeQuestion(block, 0);
    expect(questionsOf(fewer, 'ro')).toHaveLength(1);
    expect(questionsOf(fewer, 'en')).toHaveLength(1);
  });

  it('changing a question in one language leaves the other language alone', () => {
    const block = withQuestionPart(
      newBlock('questions', 'q'),
      { language: 'en', index: 0, part: 'question' },
      'Who can enter?',
    );
    expect(questionsOf(block, 'en')[0]?.question).toBe('Who can enter?');
    expect(questionsOf(block, 'ro')[0]?.question).toBe('');
  });
});
