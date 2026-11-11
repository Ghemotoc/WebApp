/**
 * layouts: the ready-made landing page layouts and the draft each one starts (story S1-E11-35;
 * bundle CMS-2c).
 *
 * A layout is a page type and a list of blocks. Its starter words come from the ro and en locale
 * files ("layouts.<layout>.<block>.<field>" in the landingPages namespace), so staff start from
 * sensible headings in both languages and change them before publishing; nothing is live until
 * then. Dates, links and pictures stay empty on purpose: publishing names them, so a page never
 * goes up with a made-up date or link.
 * Who calls it: NewLandingPageForm. What it calls: newBlock() and withEntryPart().
 */
import type {
  LandingBlock,
  LandingBlockKind,
  LandingContent,
  LandingLanguage,
  LandingPageType,
} from '@/schemas/landingPages';
import { landingFieldRules, landingLanguages } from '@/schemas/landingPages';

import { newBlock } from './blocks';
import { entriesOf, isEntryKind, withEntryPart } from './entries';

/** The layouts "New landing page" offers, besides a blank page. */
export const landingLayoutNames = ['contest', 'call_for_submissions', 'event', 'plain'] as const;

/** One layout's name. */
export type LandingLayoutName = (typeof landingLayoutNames)[number];

/** One layout: the page type it makes and its blocks, each with the key its words live under. */
interface LandingLayout {
  pageType: LandingPageType;
  blocks: readonly { key: string; kind: LandingBlockKind }[];
}

/** The layouts themselves. Each starts with the hero, as every page must. */
export const landingLayouts: Record<LandingLayoutName, LandingLayout> = {
  // A contest page needs key dates and rules to publish (S1-E11-14), and Remind me needs dates.
  contest: {
    pageType: 'contest',
    blocks: [
      { key: 'hero', kind: 'hero' },
      { key: 'dates', kind: 'key_dates' },
      { key: 'who', kind: 'who_can_enter' },
      { key: 'prize', kind: 'prize' },
      { key: 'how', kind: 'how_to_enter' },
      { key: 'rules', kind: 'rules' },
      { key: 'questions', kind: 'questions' },
      { key: 'remind', kind: 'remind_me' },
    ],
  },
  call_for_submissions: {
    pageType: 'campaign',
    blocks: [
      { key: 'hero', kind: 'hero' },
      { key: 'about', kind: 'text' },
      { key: 'steps', kind: 'steps' },
      { key: 'questions', kind: 'questions' },
      { key: 'action', kind: 'call_to_action' },
    ],
  },
  event: {
    pageType: 'campaign',
    blocks: [
      { key: 'hero', kind: 'hero' },
      { key: 'about', kind: 'text' },
      { key: 'cards', kind: 'cards' },
      { key: 'quote', kind: 'quote' },
      { key: 'action', kind: 'call_to_action' },
    ],
  },
  plain: {
    pageType: 'information',
    blocks: [
      { key: 'hero', kind: 'hero' },
      { key: 'about', kind: 'text' },
    ],
  },
};

/** Reads one starter word in one language, or '' when the layout has none for it. */
export type StarterWords = (language: LandingLanguage, key: string) => string;

/**
 * Fills one block's fields and entries with its starter words in both languages.
 *
 * @param block - the new, empty block
 * @param prefix - "layouts.<layout>.<block key>"
 * @param words - reads a starter word
 * @returns the filled block
 */
function withStarterWords(block: LandingBlock, prefix: string, words: StarterWords): LandingBlock {
  let filled = block;
  for (const language of landingLanguages) {
    // Step 1: each text field of the kind.
    const fields = { ...filled[language] };
    for (const rule of landingFieldRules[block.kind]) {
      fields[rule.field] = words(language, `${prefix}.${rule.field}`);
    }
    filled = { ...filled, [language]: fields };
    // Step 2: each card or step, numbered from 1 in the locale files.
    if (!isEntryKind(block.kind)) continue;
    entriesOf(filled, language).forEach((_, index) => {
      for (const part of ['title', 'body'] as const) {
        const value = words(language, `${prefix}.entry${index + 1}.${part}`);
        filled = withEntryPart(filled, { language, index, part }, value);
      }
    });
  }
  return filled;
}

/**
 * The draft a layout starts: its blocks in order, with starter words in both languages.
 *
 * @param name - the layout
 * @param words - reads a starter word (i18next's fixed translation for each language)
 * @returns the content to save as the first draft
 */
export function layoutContent(name: LandingLayoutName, words: StarterWords): LandingContent {
  const blocks = landingLayouts[name].blocks.map((entry, index) =>
    withStarterWords(
      newBlock(entry.kind, `${entry.key}-${index}`),
      `layouts.${name}.${entry.key}`,
      words,
    ),
  );
  return { theme: 'plum', blocks };
}
