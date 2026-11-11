/**
 * Unit tests for the ready-made layouts and Copy block (story S1-E11-35; bundle CMS-2c).
 */
import { describe, expect, it } from 'vitest';

import englishLandingPages from '@/locales/en/landingPages.json';
import romanianLandingPages from '@/locales/ro/landingPages.json';
import { landingFieldRules, type LandingLanguage } from '@/schemas/landingPages';

import { canCopyBlock, copyBlock, newBlock } from './blocks';
import { entriesOf } from './entries';
import { landingLayoutNames, landingLayouts, layoutContent } from './layouts';

/** Reads a starter word straight from the locale files, as i18next would. */
function starterWord(language: LandingLanguage, key: string): string {
  let value: unknown = language === 'ro' ? romanianLandingPages : englishLandingPages;
  for (const part of key.split('.')) {
    value =
      typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)[part]
        : undefined;
  }
  return typeof value === 'string' ? value : '';
}

describe('ready-made layouts', () => {
  it('every layout starts with the hero, as every page must', () => {
    for (const name of landingLayoutNames) {
      expect(layoutContent(name, starterWord).blocks[0]?.kind).toBe('hero');
    }
  });

  it('the contest layout makes a contest page with key dates and rules', () => {
    expect(landingLayouts.contest.pageType).toBe('contest');
    const kinds = layoutContent('contest', starterWord).blocks.map((block) => block.kind);
    expect(kinds).toContain('key_dates');
    expect(kinds).toContain('rules');
  });

  it('every required field has starter words in Romanian and English', () => {
    for (const name of landingLayoutNames) {
      for (const block of layoutContent(name, starterWord).blocks) {
        for (const rule of landingFieldRules[block.kind].filter((item) => item.isRequired)) {
          expect(block.ro[rule.field], `${name} ${block.kind} ro ${rule.field}`).not.toBe('');
          expect(block.en[rule.field], `${name} ${block.kind} en ${rule.field}`).not.toBe('');
        }
      }
    }
  });

  it('cards and steps start with titled entries in both languages', () => {
    const steps = layoutContent('call_for_submissions', starterWord).blocks.find(
      (block) => block.kind === 'steps',
    );
    expect(steps).toBeDefined();
    if (steps === undefined) return;
    expect(entriesOf(steps, 'en')[0]?.title).toBe('Write');
    expect(entriesOf(steps, 'ro')[0]?.title).toBe('Scrie');
  });

  it('dates and links stay empty, so publishing asks for real ones', () => {
    const contest = layoutContent('contest', starterWord).blocks;
    expect(contest.find((block) => block.kind === 'key_dates')?.dates?.entries_open).toBe('');
    expect(contest.find((block) => block.kind === 'rules')?.link).toBe('');
  });
});

describe('Copy block', () => {
  const content = {
    theme: 'plum' as const,
    blocks: [newBlock('hero', 'h'), newBlock('cards', 'c'), newBlock('remind_me', 'r')],
  };

  it('puts a copy straight below the block, with its own key', () => {
    const copied = copyBlock(content, 1, 'c2');
    expect(copied.blocks.map((block) => block.id)).toEqual(['h', 'c', 'c2', 'r']);
  });

  it('changing the copy leaves the original alone', () => {
    const copied = copyBlock(content, 1, 'c2');
    const copy = copied.blocks[2];
    if (copy?.ro.entries?.[0] !== undefined) copy.ro.entries[0].title = 'Changed';
    expect(copied.blocks[1]?.ro.entries?.[0]?.title).toBe('');
  });

  it('isn’t offered for the hero or Remind me, which a page holds once', () => {
    expect(canCopyBlock('hero')).toBe(false);
    expect(canCopyBlock('remind_me')).toBe(false);
    expect(copyBlock(content, 0, 'h2')).toBe(content);
  });
});
