/**
 * Editing a landing page's blocks without a server: add, move, remove and change one field
 * (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * Who calls it: the editor (components/staff/LandingPageEditor.tsx). What it calls: nothing; every
 * helper returns a new content object, so React sees the change.
 * Why Up and Down instead of dragging: every move must work from the keyboard (criterion 4).
 */
import {
  landingFieldRules,
  landingLinkKinds,
  type LandingBlock,
  type LandingBlockKind,
  type LandingContent,
  type LandingLanguage,
} from '@/schemas/landingPages';

import { emptyEntries, isEntryKind } from './entries';

/**
 * A new, empty block of one kind, with every text field present in both languages.
 *
 * @param kind - the block kind
 * @param id - a stable key for the editor's list
 * @returns the block
 */
export function newBlock(kind: LandingBlockKind, id: string): LandingBlock {
  // Step 1: every text field of this kind, empty, in each language.
  const emptyWords: Record<string, string> = {};
  for (const rule of landingFieldRules[kind]) emptyWords[rule.field] = '';
  const block: LandingBlock = { id, kind, ro: { ...emptyWords }, en: { ...emptyWords } };
  // Step 2: the fields some kinds share between the languages.
  if (kind === 'key_dates') block.dates = { entries_open: '', entries_close: '', results: '' };
  if (kind === 'who_can_enter') block.age_groups = [];
  // A Rules block and a call to action both link somewhere (S1-E11-34).
  if (landingLinkKinds.includes(kind)) block.link = '';
  // Cards and Steps start with the fewest entries they need, in both languages (S1-E11-34).
  if (isEntryKind(kind)) {
    block.ro.entries = emptyEntries(kind);
    block.en.entries = emptyEntries(kind);
  }
  if (kind === 'featured') {
    block.mode = 'hand';
    block.story_slugs = [];
    block.tag = '';
  }
  if (kind === 'questions') {
    block.ro.items = [{ question: '', answer: '' }];
    block.en.items = [{ question: '', answer: '' }];
  }
  return block;
}

/**
 * Moves one block up or down by one place. The hero stays first: nothing moves above it and it
 * never moves, so the page keeps one heading order.
 *
 * @param content - the page's content
 * @param index - the block to move
 * @param direction - -1 for up, 1 for down
 * @returns the new content (the same object when the move isn't allowed)
 */
export function moveBlock(
  content: LandingContent,
  index: number,
  direction: -1 | 1,
): LandingContent {
  const target = index + direction;
  if (!canMove(content, index, direction)) return content;
  const blocks = [...content.blocks];
  const [moving] = blocks.splice(index, 1);
  if (moving === undefined) return content;
  blocks.splice(target, 0, moving);
  return { ...content, blocks };
}

/**
 * Whether a block can move one place up or down.
 *
 * @returns true when the move stays inside the list and leaves the hero first
 */
export function canMove(content: LandingContent, index: number, direction: -1 | 1): boolean {
  const target = index + direction;
  if (target < 0 || target >= content.blocks.length) return false;
  // The hero is fixed at the top: it doesn't move, and nothing takes its place.
  const isHero = (position: number) => content.blocks[position]?.kind === 'hero';
  return !isHero(index) && !isHero(target);
}

/**
 * Removes one block.
 *
 * @returns the new content
 */
export function removeBlock(content: LandingContent, index: number): LandingContent {
  return { ...content, blocks: content.blocks.filter((_, position) => position !== index) };
}

/** The kinds a page holds only once, so Copy block isn't offered for them (S1-E11-35). */
const onlyOnceKinds: readonly LandingBlockKind[] = ['hero', 'remind_me'];

/**
 * Whether a block can be copied: every kind but the hero and Remind me, which a page holds once.
 *
 * @param kind - the block's kind
 * @returns true when Copy block is offered
 */
export function canCopyBlock(kind: LandingBlockKind): boolean {
  return !onlyOnceKinds.includes(kind);
}

/**
 * Copies one block, words, picture and links included, and puts the copy straight below it
 * (S1-E11-35). The copy is part of the draft, so nothing changes for visitors until publishing.
 *
 * @param content - the page's content
 * @param index - the block to copy
 * @param newId - the copy's own key for the editor's list
 * @returns the new content (the same object when the block can't be copied)
 */
export function copyBlock(content: LandingContent, index: number, newId: string): LandingContent {
  const source = content.blocks[index];
  if (source === undefined || !canCopyBlock(source.kind)) return content;
  // A deep copy, so changing the copy's words never changes the block it came from.
  const copy: LandingBlock = { ...structuredClone(source), id: newId };
  const blocks = [...content.blocks];
  blocks.splice(index + 1, 0, copy);
  return { ...content, blocks };
}

/**
 * Adds a block at the end, or a hero at the top (there is only ever one).
 *
 * @returns the new content
 */
export function addBlock(content: LandingContent, block: LandingBlock): LandingContent {
  if (block.kind === 'hero') return { ...content, blocks: [block, ...content.blocks] };
  return { ...content, blocks: [...content.blocks, block] };
}

/**
 * Changes one block with a function, leaving the others as they are.
 *
 * @returns the new content
 */
export function updateBlock(
  content: LandingContent,
  index: number,
  change: (block: LandingBlock) => LandingBlock,
): LandingContent {
  return {
    ...content,
    blocks: content.blocks.map((block, position) => (position === index ? change(block) : block)),
  };
}

/**
 * Changes one text field of one language.
 *
 * @returns the new block
 */
export function withWords(
  block: LandingBlock,
  language: LandingLanguage,
  field: string,
  value: string,
): LandingBlock {
  return { ...block, [language]: { ...block[language], [field]: value } };
}

/**
 * The one text field of a block in one language, as a string ("" when missing).
 *
 * @returns the words
 */
export function wordsOf(block: LandingBlock, language: LandingLanguage, field: string): string {
  const value = block[language][field];
  return typeof value === 'string' ? value : '';
}

/** One question and its answer, as the editor holds them. */
export interface LandingQuestion {
  question: string;
  answer: string;
}

/**
 * The questions of a block in one language.
 *
 * @returns the list (empty when the block has none)
 */
export function questionsOf(block: LandingBlock, language: LandingLanguage): LandingQuestion[] {
  return block[language].items ?? [];
}

/**
 * Adds an empty question at the end, in both languages, because the database wants the same
 * number of questions in each.
 *
 * @returns the new block
 */
export function addQuestion(block: LandingBlock): LandingBlock {
  const empty = { question: '', answer: '' };
  return {
    ...block,
    ro: { ...block.ro, items: [...questionsOf(block, 'ro'), empty] },
    en: { ...block.en, items: [...questionsOf(block, 'en'), { ...empty }] },
  };
}

/**
 * Removes one question from both languages.
 *
 * @returns the new block
 */
export function removeQuestion(block: LandingBlock, index: number): LandingBlock {
  const keep = (items: LandingQuestion[]) => items.filter((_, position) => position !== index);
  return {
    ...block,
    ro: { ...block.ro, items: keep(questionsOf(block, 'ro')) },
    en: { ...block.en, items: keep(questionsOf(block, 'en')) },
  };
}

/** Which part of which question, in which language. */
export interface QuestionPlace {
  language: LandingLanguage;
  index: number;
  part: keyof LandingQuestion;
}

/**
 * Changes the question or the answer of one item in one language.
 *
 * @param block - the Questions block
 * @param place - the language, the question's place and "question" or "answer"
 * @param value - the new words
 * @returns the new block
 */
export function withQuestionPart(
  block: LandingBlock,
  place: QuestionPlace,
  value: string,
): LandingBlock {
  const items = questionsOf(block, place.language).map((item, position) =>
    position === place.index ? { ...item, [place.part]: value } : item,
  );
  return { ...block, [place.language]: { ...block[place.language], items } };
}

/**
 * Puts a picture in a Hero or Text block, or takes it out (null). Its alt text stays in each
 * language, so swapping the picture keeps what the admin wrote.
 *
 * @returns the new block
 */
export function withPicture(block: LandingBlock, pictureId: string | null): LandingBlock {
  if (pictureId !== null) return { ...block, picture_id: pictureId };
  // A copy without the picture's ID; the alt text stays in each language.
  const withoutPicture = { ...block };
  delete withoutPicture.picture_id;
  return withoutPicture;
}

/**
 * Reads the story addresses an admin typed for a Featured block, one per line: a full link
 * ("https://…/s/statia-meteo"), a path ("/s/statia-meteo") or just the name ("statia-meteo").
 *
 * @param text - what the admin typed
 * @returns the story names, in order, without blanks or repeats
 */
export function storySlugsFromText(text: string): string[] {
  const slugs: string[] = [];
  for (const line of text.split('\n')) {
    // Step 1: the part after "/s/" when there is one, otherwise the whole line.
    const trimmed = line.trim();
    const afterStoryPath = trimmed.split('/s/')[1] ?? trimmed;
    // Step 2: only the story's own name, without a chapter, a query or a slash.
    const slug = (afterStoryPath.split(/[/?#]/)[0] ?? '').toLowerCase();
    if (slug !== '' && !slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}
