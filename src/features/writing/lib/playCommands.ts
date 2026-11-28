/**
 * What the play editor does to its blocks (LAYOUTS-2; board D14-EditorPlay): find the block the
 * caret is in, change its type (the toolbar's "Act or scene", "Character", "Line" and
 * "Direction", and Tab), start the next speech (Enter), and put a suggested name in a speech.
 *
 * Positions: a speech starts at `blockPosition`; its name's text starts 2 further on (inside the
 * speech, inside the name) and its line's text starts 2 after the name ends. Every change is one
 * ProseMirror transaction, so Undo takes it back in one step.
 * Who calls it: playMode.ts (keys and typing), EditorToolbar (the play buttons), the name
 * suggestions and the phone's name chips.
 */
import type { Editor } from '@tiptap/core';
import {
  Fragment,
  type Node as ProseMirrorNode,
  type NodeType,
  type Schema,
} from '@tiptap/pm/model';
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

import { PLAY_DIRECTION_NODE, PLAY_LINE_NODE, PLAY_NAME_NODE, PLAY_SPEECH_NODE } from './playNodes';

/** The kinds of block a play has, as the toolbar and the tag in the margin name them. */
export type PlayBlockKind = 'name' | 'line' | 'direction' | 'act' | 'scene' | 'text';

/** The top-level block the caret is in. */
export interface CurrentPlayBlock {
  kind: PlayBlockKind;
  /** Where the block starts in the document. */
  blockPosition: number;
  node: ProseMirrorNode;
}

/**
 * One of the editor's node types by name.
 *
 * @returns the type
 * Errors: throws when the editor runs without it (a missing extension: a bug, never the writer's).
 */
function nodeType(schema: Schema, name: string): NodeType {
  const type = schema.nodes[name];
  if (type === undefined) throw new Error(`The chapter editor has no ${name} block.`);
  return type;
}

/** The order Tab moves through (Shift+Tab goes back): board D14, "Tab: change the block type". */
const TAB_ORDER: PlayBlockKind[] = ['name', 'direction', 'act', 'scene'];

/**
 * The kind of a top-level block, with the caret's place for a speech.
 *
 * @returns the kind, or null for a block a play doesn't change (a list, a quote, a picture)
 */
function kindOf(node: ProseMirrorNode, caretParent: ProseMirrorNode): PlayBlockKind | null {
  switch (node.type.name) {
    case PLAY_SPEECH_NODE:
      return caretParent.type.name === PLAY_NAME_NODE ? 'name' : 'line';
    case PLAY_DIRECTION_NODE:
      return 'direction';
    case 'heading':
      return node.attrs.level === 2 ? 'act' : 'scene';
    case 'paragraph':
      return 'text';
    default:
      return null;
  }
}

/**
 * Finds the block the caret is in, at the top of the text.
 *
 * @param state - the editor's state
 * @returns the block, or null when the caret is in a list, a quote or nowhere a play changes
 */
export function currentPlayBlock(state: EditorState): CurrentPlayBlock | null {
  const { $from } = state.selection;
  if ($from.depth < 1) return null;
  const node = $from.node(1);
  const kind = kindOf(node, $from.parent);
  return kind === null ? null : { kind, blockPosition: $from.before(1), node };
}

/** The name typed in a speech, or '' for any other block. */
export function speechName(node: ProseMirrorNode): string {
  return node.type.name === PLAY_SPEECH_NODE ? (node.firstChild?.textContent ?? '') : '';
}

/** Where a speech's line text starts, from where the speech starts. */
function lineStart(speech: ProseMirrorNode, blockPosition: number): number {
  return blockPosition + 1 + (speech.firstChild?.nodeSize ?? 2) + 1;
}

/** The words a block carries into its new type: a speech gives its line, or else its name. */
function carriedContent(block: CurrentPlayBlock): Fragment {
  if (block.node.type.name !== PLAY_SPEECH_NODE) return block.node.content;
  const line = block.node.lastChild;
  if (line !== null && line.content.size > 0) return line.content;
  return block.node.firstChild?.content ?? Fragment.empty;
}

/**
 * A new block of a kind, holding these words.
 *
 * @returns the node and where its text starts, counted from the block's start
 */
function makeBlock(state: EditorState, kind: PlayBlockKind, content: Fragment) {
  const { schema } = state;
  if (kind === 'name' || kind === 'line') {
    const speech = nodeType(schema, PLAY_SPEECH_NODE).create(null, [
      nodeType(schema, PLAY_NAME_NODE).create(),
      nodeType(schema, PLAY_LINE_NODE).create(null, content),
    ]);
    return {
      node: speech,
      textStart: kind === 'name' ? 2 : 4,
      textSize: kind === 'name' ? 0 : content.size,
    };
  }
  if (kind === 'direction') {
    return {
      node: nodeType(schema, PLAY_DIRECTION_NODE).create(null, content),
      textStart: 1,
      textSize: content.size,
    };
  }
  if (kind === 'act' || kind === 'scene') {
    const heading = nodeType(schema, 'heading').create({ level: kind === 'act' ? 2 : 3 }, content);
    return { node: heading, textStart: 1, textSize: content.size };
  }
  return {
    node: nodeType(schema, 'paragraph').create(null, content),
    textStart: 1,
    textSize: content.size,
  };
}

/**
 * Moves the caret inside the block it is in (a speech's name or line) without changing anything.
 *
 * @returns true when it moved
 */
function moveWithinSpeech(editor: Editor, block: CurrentPlayBlock, kind: PlayBlockKind): boolean {
  const nameEnd = block.blockPosition + 2 + (block.node.firstChild?.content.size ?? 0);
  const lineEnd =
    lineStart(block.node, block.blockPosition) + (block.node.lastChild?.content.size ?? 0);
  const target = kind === 'name' ? nameEnd : lineEnd;
  const transaction = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, target));
  editor.view.dispatch(transaction.scrollIntoView());
  editor.view.focus();
  return true;
}

/**
 * Changes the block the caret is in to another kind, its words kept (the toolbar and Tab).
 *
 * @param editor - the chapter editor
 * @param kind - the kind to make it
 * @returns true when the block changed (or the caret moved within a speech)
 */
export function setPlayBlockKind(editor: Editor, kind: PlayBlockKind): boolean {
  const block = currentPlayBlock(editor.state);
  if (block === null) return false;
  // Step 1: a speech going to its own name or line only moves the caret.
  const isSpeech = block.kind === 'name' || block.kind === 'line';
  if (isSpeech && (kind === 'name' || kind === 'line'))
    return moveWithinSpeech(editor, block, kind);
  // Step 2: the new block replaces the old one, with the old one's words.
  const made = makeBlock(editor.state, kind, carriedContent(block));
  const transaction = editor.state.tr.replaceWith(
    block.blockPosition,
    block.blockPosition + block.node.nodeSize,
    made.node,
  );
  // Step 3: the caret goes to the end of the words, or into the new speech's name.
  const caret = block.blockPosition + made.textStart + made.textSize;
  transaction.setSelection(TextSelection.create(transaction.doc, caret));
  editor.view.dispatch(transaction.scrollIntoView());
  editor.view.focus();
  return true;
}

/**
 * The kind Tab (or Shift+Tab) turns a block into: Character, Direction, Act, Scene, round again.
 *
 * @param kind - the block's kind now
 * @param step - 1 for Tab, -1 for Shift+Tab
 * @returns the next kind
 */
export function nextKindForTab(kind: PlayBlockKind, step: 1 | -1): PlayBlockKind {
  const from = kind === 'line' ? 'name' : kind;
  const index = TAB_ORDER.indexOf(from);
  // A plain paragraph starts the round at Character.
  if (index === -1) return 'name';
  return TAB_ORDER[(index + step + TAB_ORDER.length) % TAB_ORDER.length] ?? 'name';
}

/**
 * Puts a new, empty speech after a block and the caret in its name, moving any words after the
 * caret into the new speech's line (Enter in a line, at the end of a direction or a heading).
 *
 * @param editor - the chapter editor
 * @param block - the block the caret is in
 * @returns true when the speech was added
 */
export function startNextSpeech(editor: Editor, block: CurrentPlayBlock): boolean {
  const { state } = editor;
  const { schema } = state;
  let transaction: Transaction = state.tr.deleteSelection();
  // Step 1: the words after the caret, in the same block, move to the next speech's line.
  const { $from } = transaction.selection;
  const textblockEnd = $from.end();
  const after = $from.parent.content.cut($from.parentOffset);
  if (after.size > 0) transaction = transaction.delete($from.pos, textblockEnd);
  // Step 2: the new speech goes right after the block (the cuts above were inside it, so the
  // block still starts where it did).
  const blockAfterCuts = transaction.doc.nodeAt(block.blockPosition);
  if (blockAfterCuts === null) return false;
  const blockEnd = block.blockPosition + blockAfterCuts.nodeSize;
  const speech = nodeType(schema, PLAY_SPEECH_NODE).create(null, [
    nodeType(schema, PLAY_NAME_NODE).create(),
    nodeType(schema, PLAY_LINE_NODE).create(null, after),
  ]);
  transaction.insert(blockEnd, speech);
  transaction.setSelection(TextSelection.create(transaction.doc, blockEnd + 2));
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
}

/**
 * Puts a name in the speech the caret is in and moves the caret to its line (a suggestion
 * picked under the name, or a name chip tapped on a phone).
 *
 * @param editor - the chapter editor
 * @param name - the character's name, as the cast writes it
 * @returns true when the caret was in a speech's name
 */
export function putNameInSpeech(editor: Editor, name: string): boolean {
  const block = currentPlayBlock(editor.state);
  if (block === null || block.kind !== 'name') return false;
  // Step 1: the name's text is replaced with the cast's spelling.
  const nameStart = block.blockPosition + 2;
  const nameEnd = nameStart + (block.node.firstChild?.content.size ?? 0);
  const transaction = editor.state.tr;
  if (name === '') transaction.delete(nameStart, nameEnd);
  else transaction.replaceWith(nameStart, nameEnd, editor.state.schema.text(name));
  // Step 2: the caret goes to the start of the line.
  const speech = transaction.doc.nodeAt(block.blockPosition);
  if (speech === null) return false;
  transaction.setSelection(
    TextSelection.create(transaction.doc, lineStart(speech, block.blockPosition)),
  );
  editor.view.dispatch(transaction.scrollIntoView());
  editor.view.focus();
  return true;
}

/**
 * Renames a character in every speech of the chapter (a name changed in the Characters panel).
 *
 * @param editor - the chapter editor
 * @param oldName - the name as it was (matched ignoring capitals and outer spaces)
 * @param newName - the new name
 * @returns how many speeches changed
 */
export function renameSpeeches(editor: Editor, oldName: string, newName: string): number {
  const wanted = oldName.trim().toLowerCase();
  const transaction = editor.state.tr;
  let changed = 0;
  editor.state.doc.forEach((node, offset) => {
    if (node.type.name !== PLAY_SPEECH_NODE || speechName(node).trim().toLowerCase() !== wanted)
      return;
    // The positions shift as names change length, so each one is mapped through the changes.
    const nameStart = transaction.mapping.map(offset + 2);
    const nameEnd = transaction.mapping.map(offset + 2 + (node.firstChild?.content.size ?? 0));
    transaction.replaceWith(nameStart, nameEnd, editor.state.schema.text(newName));
    changed += 1;
  });
  if (changed > 0) editor.view.dispatch(transaction);
  return changed;
}

/**
 * Turns the block the caret is in into a speech by this character, its line still empty ("MARA"
 * then ":" typed at the start of a paragraph).
 *
 * @param editor - the chapter editor
 * @param block - the block the caret is in
 * @param name - the character's name
 * @returns true, the block having changed
 */
export function turnIntoSpeech(editor: Editor, block: CurrentPlayBlock, name: string): boolean {
  const { schema } = editor.state;
  const speech = nodeType(schema, PLAY_SPEECH_NODE).create(null, [
    nodeType(schema, PLAY_NAME_NODE).create(null, name === '' ? null : schema.text(name)),
    nodeType(schema, PLAY_LINE_NODE).create(),
  ]);
  const transaction = editor.state.tr.replaceWith(
    block.blockPosition,
    block.blockPosition + block.node.nodeSize,
    speech,
  );
  transaction.setSelection(
    TextSelection.create(transaction.doc, lineStart(speech, block.blockPosition)),
  );
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
}
