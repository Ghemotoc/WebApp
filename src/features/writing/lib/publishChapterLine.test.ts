/**
 * The line under the Publish chapter dialog's heading (board D06, user story 5.6).
 */
import { describe, expect, it } from 'vitest';

import englishEditor from '@/locales/en/editor.json';

import { publishChapterLine } from './publishChapterLine';

/** A stand-in for t(): the English words with their values filled in. */
function englishT(key: string, values: Record<string, unknown>): string {
  const name = key.replace('publish.', '') as keyof typeof englishEditor.publish;
  const words = String(englishEditor.publish[name]);
  return words.replace(/\{\{(\w+)\}\}/g, (_match, field: string) => String(values[field]));
}

describe('publishChapterLine (board D06)', () => {
  it('names the chapter by its number and title', () => {
    expect(publishChapterLine(englishT, 16, 'Epilogue: Spring')).toBe(
      'Chapter 16 · Epilogue: Spring',
    );
  });

  it('an untitled chapter shows its number only', () => {
    expect(publishChapterLine(englishT, 16, '   ')).toBe('Chapter 16');
  });

  it('waits for the number', () => {
    expect(publishChapterLine(englishT, null, 'Epilogue: Spring')).toBe('');
  });
});
