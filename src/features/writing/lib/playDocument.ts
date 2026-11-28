/**
 * The play layout's document helpers (LAYOUTS-2; board D14-EditorPlay; storage format in
 * docs/decisions.md, LAYOUTS-1).
 *
 * A play is stored like any chapter, as the Markdown subset (CLAUDE.md rule 8): acts are `## Act`,
 * scenes `### Scene`, a speech is a paragraph that starts with the speaker's name in bold and a
 * colon (`**MARA:** words`) and a stage direction is a paragraph in italics (`*She laughs.*`).
 * The editor holds a play in its own blocks so the writer can type it the way the board draws it:
 * a speech (playSpeech) is the name (playName) beside its line (playLine), and a direction is a
 * playDirection. This file turns one into the other, at the edges:
 * - toPlayDocument(): after the stored Markdown is read (markdownToEditorDocument), a play's
 *   speeches and directions become play blocks.
 * - playBlockToParagraph(): on save, each play block goes back to the paragraph Markdown stores
 *   (chapterMarkdown.ts calls it), and when the writer switches a play to prose or a poem.
 * - pastedParagraphToPlay(): pasted text in a play turns "NAME: words" lines into speeches, lines
 *   in brackets into directions, and "Act" and "Scene" lines into headings.
 * - countPlayBlocks() and playNameSuggestions(): the footer's counts and the names suggested
 *   under a speech.
 * Who calls it: chapterMarkdown.ts, useChapterEditor, playMode.ts and the play components.
 * Tests: playDocument.test.ts.
 */
import type { EditorMark, EditorNode } from './chapterMarkdown';

/** The longest name a speech or the cast takes (the same limit as set_story_cast()). */
export const MAXIMUM_CHARACTER_NAME_LENGTH = 40;

/** The most words a pasted "NAME:" may have before it reads as an ordinary sentence. */
const MAXIMUM_NAME_WORDS = 4;

/* ---------- Small helpers ---------- */

/** The text of inline nodes, footnotes and breaks left out. */
function inlineText(nodes: EditorNode[] | undefined): string {
  return (nodes ?? []).map((node) => (node.type === 'text' ? (node.text ?? '') : '')).join('');
}

/** True when a run of text carries a mark of this kind. */
function hasMark(node: EditorNode, type: EditorMark['type']): boolean {
  return (node.marks ?? []).some((mark) => mark.type === type);
}

/** A copy of a text node without one kind of mark (an empty marks list is left out). */
function withoutMark(node: EditorNode, type: EditorMark['type']): EditorNode {
  if (node.type !== 'text') return node;
  const marks = (node.marks ?? []).filter((mark) => mark.type !== type);
  const copy: EditorNode = { type: 'text', text: node.text ?? '' };
  return marks.length === 0 ? copy : { ...copy, marks };
}

/** A copy of a text node with one more mark (kept once). */
function withMark(node: EditorNode, mark: EditorMark): EditorNode {
  if (node.type !== 'text' || hasMark(node, mark.type)) return node;
  return { ...node, marks: [...(node.marks ?? []), mark] };
}

/**
 * Inline content without its first characters, the marks of what is left kept.
 *
 * @param nodes - the inline content
 * @param count - how many characters to drop from the start (text only)
 * @returns what is left; a run emptied by it is removed
 */
function dropLeadingCharacters(nodes: EditorNode[], count: number): EditorNode[] {
  let toDrop = count;
  const result: EditorNode[] = [];
  for (const node of nodes) {
    // Step 1: once enough is dropped, the rest is kept as it is.
    if (toDrop === 0 || node.type !== 'text') {
      result.push(node);
      continue;
    }
    // Step 2: a run shorter than what is left to drop goes; a longer one is cut.
    const text = node.text ?? '';
    if (text.length <= toDrop) {
      toDrop -= text.length;
      continue;
    }
    result.push({ ...node, text: text.slice(toDrop) });
    toDrop = 0;
  }
  return result;
}

/** The same content without spaces at its start (a speech's line starts at its first word). */
function trimLeadingSpaces(nodes: EditorNode[]): EditorNode[] {
  const leading = /^\s*/.exec(inlineText(nodes))?.[0].length ?? 0;
  return dropLeadingCharacters(nodes, leading);
}

/** A playSpeech node: the name beside its line. */
export function speechNode(name: string, line: EditorNode[]): EditorNode {
  const nameNode: EditorNode =
    name === ''
      ? { type: 'playName' }
      : { type: 'playName', content: [{ type: 'text', text: name }] };
  const lineNode: EditorNode =
    line.length === 0 ? { type: 'playLine' } : { type: 'playLine', content: line };
  return { type: 'playSpeech', content: [nameNode, lineNode] };
}

/** A playDirection node holding these words. */
export function directionNode(content: EditorNode[]): EditorNode {
  return content.length === 0 ? { type: 'playDirection' } : { type: 'playDirection', content };
}

/* ---------- Stored text → play blocks ---------- */

/**
 * A paragraph that starts with a bold "NAME:" becomes a speech: `**MARA:** words` or, as some
 * writers type it, `**MARA**: words`.
 *
 * @param paragraph - a top-level paragraph of the editor's document
 * @returns the speech, or null when the paragraph doesn't start with a bold name and a colon
 */
function storedSpeech(paragraph: EditorNode): EditorNode | null {
  const content = paragraph.content ?? [];
  const first = content[0];
  if (first?.type !== 'text' || !hasMark(first, 'bold')) return null;
  // Step 1: the bold run is the name, with its colon inside ("MARA:") or just after (": ").
  const boldText = first.text ?? '';
  const rest = content.slice(1);
  let name: string;
  let line: EditorNode[];
  if (boldText.trimEnd().endsWith(':')) {
    name = boldText.trimEnd().slice(0, -1).trim();
    line = rest;
  } else if (inlineText(rest).startsWith(':')) {
    name = boldText.trim();
    line = dropLeadingCharacters(rest, 1);
  } else {
    return null;
  }
  // Step 2: a name has words and fits the cast's limit; the line starts at its first word.
  if (name === '' || name.length > MAXIMUM_CHARACTER_NAME_LENGTH) return null;
  return speechNode(name, trimLeadingSpaces(line));
}

/**
 * A paragraph that is all italics becomes a stage direction, its words no longer italic in the
 * editor (the direction is drawn in italics).
 *
 * @param paragraph - a top-level paragraph
 * @returns the direction, or null when some of its words aren't in italics
 */
function storedDirection(paragraph: EditorNode): EditorNode | null {
  const content = paragraph.content ?? [];
  const texts = content.filter((node) => node.type === 'text');
  if (texts.length === 0 || inlineText(content).trim() === '') return null;
  if (!texts.every((node) => hasMark(node, 'italic'))) return null;
  return directionNode(content.map((node) => withoutMark(node, 'italic')));
}

/**
 * Turns a document read from stored Markdown into play blocks: speeches and directions at the
 * top level become playSpeech and playDirection; headings (acts and scenes) and everything else
 * stay as they are.
 *
 * @param document - the editor's document (markdownToEditorDocument)
 * @returns a copy with play blocks
 */
export function toPlayDocument(document: EditorNode): EditorNode {
  const content = (document.content ?? []).map((node) => {
    if (node.type !== 'paragraph') return node;
    return storedSpeech(node) ?? storedDirection(node) ?? node;
  });
  return { ...document, content };
}

/* ---------- Play blocks → stored text ---------- */

/**
 * One play block as the paragraph Markdown stores: a speech is its name in bold with a colon,
 * then its line; a direction is its words in italics. Any other node is given back as it is.
 *
 * @param node - a block of the editor's document
 * @returns a paragraph for a play block, or the node itself
 */
export function playBlockToParagraph(node: EditorNode): EditorNode {
  if (node.type === 'playDirection') {
    return paragraphOf((node.content ?? []).map((child) => withMark(child, { type: 'italic' })));
  }
  if (node.type !== 'playSpeech') return node;
  return paragraphOf(speechContent(node));
}

/** A paragraph holding this content, or an empty one. */
function paragraphOf(content: EditorNode[]): EditorNode {
  return content.length === 0 ? { type: 'paragraph' } : { type: 'paragraph', content };
}

/** A speech's words as stored: "**NAME:** " before the line; without a name, only the line. */
function speechContent(speech: EditorNode): EditorNode[] {
  const [nameNode, lineNode] = speech.content ?? [];
  const name = inlineText(nameNode?.content).trim();
  const line = lineNode?.content ?? [];
  if (name === '') return line;
  return [
    { type: 'text', text: `${name}:`, marks: [{ type: 'bold' }] },
    { type: 'text', text: ' ' },
    ...line,
  ];
}

/**
 * The whole document back to ordinary paragraphs, for a play switched to prose or a poem.
 *
 * @param document - the editor's document
 * @returns a copy without play blocks; the stored Markdown is the same either way
 */
export function fromPlayDocument(document: EditorNode): EditorNode {
  return { ...document, content: (document.content ?? []).map(playBlockToParagraph) };
}

/* ---------- Pasting into a play ---------- */

/** "Act", "Actul" (ro) and the like at the start of a line: an act's heading. */
const actLine = /^(act|actul)\b/i;

/** "Scene", "Scena" (ro), "Tabloul" (ro) at the start of a line: a scene's heading. */
const sceneLine = /^(scene|scena|tabloul)\b/i;

/**
 * True when a pasted "NAME:" really is a name: 1 to 40 characters, at most four words, starting
 * with a letter, without the punctuation that ends or splits a sentence.
 *
 * @param name - the words before the colon
 * @returns whether to read it as a speaker
 */
export function looksLikeCharacterName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed === '' || trimmed.length > MAXIMUM_CHARACTER_NAME_LENGTH) return false;
  if (trimmed.split(/\s+/).length > MAXIMUM_NAME_WORDS) return false;
  if (!/^\p{L}/u.test(trimmed)) return false;
  return !/[.!?,;"“”()[\]]/.test(trimmed.replace(/^(mr|mrs|ms|dr|st)\./i, ''));
}

/**
 * A pasted "Act …" or "Scene …" line, if it is short enough to be a heading.
 *
 * @returns the heading (level 2 an act, 3 a scene), or null
 */
function pastedHeading(content: EditorNode[], trimmed: string): EditorNode | null {
  if (trimmed.length > 60) return null;
  if (actLine.test(trimmed))
    return { type: 'heading', attrs: { level: 2 }, content: trimLeadingSpaces(content) };
  if (sceneLine.test(trimmed))
    return { type: 'heading', attrs: { level: 3 }, content: trimLeadingSpaces(content) };
  return null;
}

/**
 * One pasted paragraph in a play: an "Act …" or "Scene …" line becomes a heading, "NAME: words" a
 * speech, a line wholly in brackets or italics a direction, and anything else stays a paragraph.
 *
 * @param paragraph - a paragraph as ProseMirror parsed the paste
 * @returns the block to insert instead
 */
export function pastedParagraphToPlay(paragraph: EditorNode): EditorNode {
  if (paragraph.type !== 'paragraph') return paragraph;
  const content = paragraph.content ?? [];
  const text = inlineText(content);
  const trimmed = text.trim();
  // Step 1: an act or a scene heading ("Act II: The mine" is a heading, not a speech by "Act II").
  const heading = pastedHeading(content, trimmed);
  if (heading !== null) return heading;
  // Step 2: a speech: the name, its colon, then the line (a bold name is as good as a plain one).
  const speechMatch = /^\s*([^:\n]+?)\s*:\s*/.exec(text);
  if (speechMatch !== null && looksLikeCharacterName(speechMatch[1] ?? '')) {
    const name = (speechMatch[1] ?? '').trim();
    const line = dropLeadingCharacters(content, speechMatch[0].length);
    return speechNode(name, line);
  }
  // Step 3: a direction: the whole line in round or square brackets, or all in italics.
  if (/^[([].*[)\]]$/s.test(trimmed)) return directionNode(trimLeadingSpaces(content));
  return storedDirection(paragraph) ?? paragraph;
}

/* ---------- Counts and suggestions ---------- */

/** The footer's counts: speeches (lines) and directions (board D14: "7 lines · 2 directions"). */
export interface PlayCounts {
  lines: number;
  directions: number;
  /** How many speeches each name has, keyed by the name in lower case. */
  linesByName: Map<string, number>;
}

/**
 * Counts a play's speeches and directions.
 *
 * @param document - the editor's document
 * @returns the counts, and each name's number of speeches
 */
export function countPlayBlocks(document: EditorNode): PlayCounts {
  const counts: PlayCounts = { lines: 0, directions: 0, linesByName: new Map() };
  for (const node of document.content ?? []) {
    if (node.type === 'playDirection') counts.directions += 1;
    if (node.type !== 'playSpeech') continue;
    counts.lines += 1;
    const name = inlineText(node.content?.[0]?.content).trim().toLowerCase();
    if (name !== '') counts.linesByName.set(name, (counts.linesByName.get(name) ?? 0) + 1);
  }
  return counts;
}

/** One choice under a name being typed: a character of the cast, or "Add … to the cast". */
export type NameSuggestion = { kind: 'cast'; name: string } | { kind: 'add'; name: string };

/** The most cast names listed under a name being typed. */
const MAXIMUM_SUGGESTIONS = 6;

/**
 * The names to suggest while a speaker's name is typed (board D14: "Mara", "Mrs Dobre", then
 * "Add “M…” to the cast"): the cast's names that start with what is typed, or have a word that
 * does, then the offer to add it when it isn't in the cast yet.
 *
 * @param typed - the name typed so far
 * @param castNames - the story's cast, in the writer's order
 * @returns the choices; none while nothing is typed
 */
export function playNameSuggestions(typed: string, castNames: string[]): NameSuggestion[] {
  const wanted = typed.trim().toLowerCase();
  if (wanted === '') return [];
  // Step 1: the names that start with it, then the ones with a later word that does.
  const startsWith = castNames.filter((name) => name.toLowerCase().startsWith(wanted));
  const wordStartsWith = castNames.filter(
    (name) =>
      !startsWith.includes(name) &&
      name
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.startsWith(wanted)),
  );
  const suggestions: NameSuggestion[] = [...startsWith, ...wordStartsWith]
    .slice(0, MAXIMUM_SUGGESTIONS)
    .map((name) => ({ kind: 'cast', name }));
  // Step 2: the offer to add a new name, while the cast doesn't have it.
  const isInCast = castNames.some((name) => name.toLowerCase() === wanted);
  if (!isInCast && typed.trim().length <= MAXIMUM_CHARACTER_NAME_LENGTH) {
    suggestions.push({ kind: 'add', name: typed.trim() });
  }
  return suggestions;
}
