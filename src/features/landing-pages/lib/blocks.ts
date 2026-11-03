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
  type LandingBlock,
  type LandingBlockKind,
  type LandingContent,
  type LandingLanguage,
} from '@/schemas/landingPages';

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
  if (kind === 'rules') block.link = '';
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
