/**
 * Play mode in the chapter editor (LAYOUTS-2; board D14-EditorPlay, the keys box under
 * "Characters"):
 * - Enter: "next block: a name, then its line". In a name, Enter goes to the line (taking the
 *   suggested name first); in a line, or at the end of a direction or a heading, Enter starts the
 *   next speech with the caret in its name. Enter in a speech that is still empty turns it into a
 *   direction, and in an empty direction back into a speech. Shift+Enter is a new line in a line.
 * - Tab: "change the block type", Character → Direction → Act → Scene and round; Shift+Tab goes
 *   back. Escape, then Tab, leaves the text as everywhere else (WCAG 2.1.2, no keyboard trap).
 * - "(": "at the start: a stage direction": typed first in an empty speech, it makes a direction.
 * - "NAME:": "typed or pasted, becomes a line": a colon typed after a short name at the start of
 *   a paragraph makes it a speech, and in a name it goes to the line; pasted "NAME: words" lines,
 *   lines in brackets and "Act" or "Scene" lines become speeches, directions and headings.
 * - Up and Down move through the names suggested under the name being typed; Escape closes them.
 * It also marks the block with the caret (`tmc-play-current`, so the tag in the margin has room)
 * and shows "Name" in an empty name.
 * It does nothing while storage.isPlay is false, so prose and poems are unchanged.
 * Who uses it: editorExtensions.ts; useChapterEditor sets isPlay and the labels; usePlayCast sets
 * the cast; PlayNameSuggestions reads the suggestions.
 */
import { Extension, type Editor } from '@tiptap/core';
import { Fragment, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import type { EditorNode } from './chapterMarkdown';
import {
  currentPlayBlock,
  nextKindForTab,
  putNameInSpeech,
  setPlayBlockKind,
  speechName,
  startNextSpeech,
  turnIntoSpeech,
  type CurrentPlayBlock,
} from './playCommands';
import {
  looksLikeCharacterName,
  pastedParagraphToPlay,
  playNameSuggestions,
  type NameSuggestion,
} from './playDocument';
import { PLAY_NAME_NODE, PLAY_SPEECH_NODE } from './playNodes';

/** What the extension remembers while a chapter is open. */
export interface PlayModeStorage {
  /** True when the chapter's layout is Play. */
  isPlay: boolean;
  /** The story's cast, in the writer's order (usePlayCast). */
  castNames: string[];
  /** The suggestion picked with Up and Down, for the name it was picked for. */
  activeSuggestion: { forName: string; index: number };
  /** The name whose suggestions Escape closed, so they stay closed until it changes. */
  dismissedFor: string | null;
  /** True after Escape: the next Tab leaves the text instead of changing the block. */
  tabLeaves: boolean;
  /** The words shown in an empty name ("Name"), in the page's language. */
  namePlaceholder: string;
  /** Adds a typed name to the cast ("Add “M…” to the cast"); usePlayCast sets it. */
  addToCast: (name: string) => void;
}

declare module '@tiptap/core' {
  interface Storage {
    playMode: PlayModeStorage;
  }
}

/** The key the plugin answers to, and the meta a suggestion change sends so the list redraws. */
export const playModeKey = new PluginKey('playMode');

/** The suggestions under the name the caret is in, and which one Enter takes. */
export interface VisibleSuggestions {
  items: NameSuggestion[];
  activeIndex: number;
  /** Where the speech starts, so the list can sit under it. */
  blockPosition: number;
}

/**
 * The name suggestions to show now: none outside a name, none once Escape closed them.
 *
 * @param editor - the chapter editor
 * @returns the list, possibly empty
 */
export function visibleSuggestions(editor: Editor): VisibleSuggestions {
  const storage = editor.storage.playMode;
  const block = storage.isPlay ? currentPlayBlock(editor.state) : null;
  if (block?.kind !== 'name') return { items: [], activeIndex: 0, blockPosition: -1 };
  const typed = speechName(block.node);
  if (storage.dismissedFor === typed) return { items: [], activeIndex: 0, blockPosition: -1 };
  const items = playNameSuggestions(typed, storage.castNames);
  const picked = storage.activeSuggestion.forName === typed ? storage.activeSuggestion.index : 0;
  return {
    items,
    activeIndex: Math.min(picked, Math.max(items.length - 1, 0)),
    blockPosition: block.blockPosition,
  };
}

/**
 * Takes a suggestion: a cast name goes into the speech, and "Add … to the cast" also adds it.
 *
 * @returns true when the caret was in a name
 */
export function pickSuggestion(editor: Editor, suggestion: NameSuggestion): boolean {
  if (suggestion.kind === 'add') editor.storage.playMode.addToCast(suggestion.name);
  return putNameInSpeech(editor, suggestion.name);
}

/** Moves the picked suggestion up or down, and redraws the list. */
function moveSuggestion(editor: Editor, step: 1 | -1): boolean {
  const { items, activeIndex } = visibleSuggestions(editor);
  if (items.length === 0) return false;
  const block = currentPlayBlock(editor.state);
  const typed = block === null ? '' : speechName(block.node);
  editor.storage.playMode.activeSuggestion = {
    forName: typed,
    index: (activeIndex + step + items.length) % items.length,
  };
  editor.view.dispatch(editor.state.tr.setMeta(playModeKey, 'suggestions'));
  return true;
}

/** True when a speech has no name and no line yet. */
function isEmptySpeech(node: ProseMirrorNode): boolean {
  return (
    node.type.name === PLAY_SPEECH_NODE &&
    node.textContent === '' &&
    node.lastChild?.childCount === 0
  );
}

/** True when the caret, with nothing selected, is at the very end of its block's text. */
function isAtEnd(state: EditorState): boolean {
  const { $from, empty } = state.selection;
  return empty && $from.parentOffset === $from.parent.content.size;
}

/** Enter in a name: the suggested name first, then on to the line (or a direction when empty). */
function enterInName(editor: Editor, block: CurrentPlayBlock): boolean {
  if (isEmptySpeech(block.node)) return setPlayBlockKind(editor, 'direction');
  const { items, activeIndex } = visibleSuggestions(editor);
  const suggestion = items[activeIndex];
  if (suggestion !== undefined) return pickSuggestion(editor, suggestion);
  return setPlayBlockKind(editor, 'line');
}

/**
 * What Enter does in a play.
 *
 * @returns true when play mode handled it; false hands it to the editor's own Enter
 */
function handleEnter(editor: Editor): boolean {
  const block = currentPlayBlock(editor.state);
  if (block === null) return false;
  switch (block.kind) {
    case 'name':
      return enterInName(editor, block);
    case 'line':
      // A speech typed nowhere yet turns into a direction; otherwise the next speech starts.
      if (isEmptySpeech(block.node)) return setPlayBlockKind(editor, 'direction');
      return startNextSpeech(editor, block);
    case 'direction':
      if (block.node.content.size === 0) return setPlayBlockKind(editor, 'name');
      return isAtEnd(editor.state) && startNextSpeech(editor, block);
    default:
      // At the end of an act or a scene heading the next speech starts; a paragraph is as usual.
      return block.kind !== 'text' && isAtEnd(editor.state) && startNextSpeech(editor, block);
  }
}

/** Tab and Shift+Tab: the next or previous block type, unless Escape asked to leave the text. */
function handleTab(editor: Editor, step: 1 | -1): boolean {
  const storage = editor.storage.playMode;
  if (storage.tabLeaves) {
    storage.tabLeaves = false;
    return false;
  }
  const block = currentPlayBlock(editor.state);
  if (block === null) return false;
  return setPlayBlockKind(editor, nextKindForTab(block.kind, step));
}

/** Backspace at the start of a line goes to the end of its name, and empties an empty speech. */
function handleBackspace(editor: Editor): boolean {
  const block = currentPlayBlock(editor.state);
  const { $from, empty } = editor.state.selection;
  if (block === null || !empty || $from.parentOffset !== 0) return false;
  if (block.kind === 'line') return setPlayBlockKind(editor, 'name');
  if (block.kind !== 'name') return false;
  // An empty speech becomes an empty paragraph, which the next Backspace joins as usual; a
  // speech with words stays whole (half a speech can't be joined into the block above).
  if (isEmptySpeech(block.node)) return setPlayBlockKind(editor, 'text');
  return true;
}

/** Delete at the end of a name goes to the line instead of pulling the line into the name. */
function handleDelete(editor: Editor): boolean {
  const block = currentPlayBlock(editor.state);
  if (block?.kind !== 'name' || !isAtEnd(editor.state)) return false;
  return setPlayBlockKind(editor, 'line');
}

/** Escape closes the suggestions, or lets the next Tab leave the text. */
function handleEscape(editor: Editor): boolean {
  const storage = editor.storage.playMode;
  const { items } = visibleSuggestions(editor);
  const block = currentPlayBlock(editor.state);
  if (items.length > 0 && block !== null) {
    storage.dismissedFor = speechName(block.node);
    editor.view.dispatch(editor.state.tr.setMeta(playModeKey, 'suggestions'));
    return true;
  }
  storage.tabLeaves = true;
  return false;
}

/**
 * Typing in a play: "(" first in an empty speech makes a direction, ":" in a name goes to the
 * line, and ":" after a short name at the start of a paragraph makes it a speech.
 *
 * @returns true when play mode handled the typing
 */
function handleTextInput(editor: Editor, text: string): boolean {
  const block = currentPlayBlock(editor.state);
  if (block?.kind === 'name') return typedInName(editor, block, text);
  if (block?.kind !== 'text' || text !== ':' || !isAtEnd(editor.state)) return false;
  // "MARA" then ":" at the start of a plain paragraph: the paragraph becomes Mara's speech.
  const typed = block.node.textContent;
  const hasOnlyText = block.node.content.content.every((child) => child.isText);
  if (!hasOnlyText || typed.includes(':') || !looksLikeCharacterName(typed)) return false;
  return turnIntoSpeech(editor, block, typed.trim());
}

/** In a name: "(" first makes a direction, and ":" goes on to the line. */
function typedInName(editor: Editor, block: CurrentPlayBlock, text: string): boolean {
  if (text === '(' && isEmptySpeech(block.node)) {
    setPlayBlockKind(editor, 'direction');
    editor.commands.insertContent('(');
    return true;
  }
  return text === ':' && setPlayBlockKind(editor, 'line');
}

/**
 * Pasted blocks in a play: "NAME: words" lines become speeches, and the rest as
 * pastedParagraphToPlay() says.
 *
 * @returns the slice to insert; unchanged when nothing in it turned into a play block
 */
function playPaste(slice: Slice, state: EditorState): Slice {
  const nodes: ProseMirrorNode[] = [];
  let hasChanged = false;
  slice.content.forEach((node) => {
    const json = node.toJSON() as EditorNode;
    const converted = pastedParagraphToPlay(json);
    if (converted !== json) hasChanged = true;
    nodes.push(converted === json ? node : state.schema.nodeFromJSON(converted));
  });
  // Whole blocks, so a pasted speech never merges into the paragraph the caret is in.
  return hasChanged ? new Slice(Fragment.fromArray(nodes), 0, 0) : slice;
}

/**
 * The marks the editor draws: the block with the caret (`tmc-play-current`, on a speech's line)
 * and the placeholder in every empty name.
 *
 * @returns the decorations, none outside a play
 */
function playDecorations(state: EditorState, storage: PlayModeStorage): DecorationSet {
  if (!storage.isPlay) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  // Step 1: every empty name shows "Name".
  state.doc.forEach((node, offset) => {
    const nameNode = node.type.name === PLAY_SPEECH_NODE ? node.firstChild : null;
    if (nameNode?.type.name !== PLAY_NAME_NODE || nameNode.content.size > 0) return;
    decorations.push(
      Decoration.node(offset + 1, offset + 1 + nameNode.nodeSize, {
        class: 'tmc-play-empty-name',
        'data-placeholder': storage.namePlaceholder,
      }),
    );
  });
  // Step 2: the block with the caret, so its first line leaves room for the tag in the margin.
  const block = currentPlayBlock(state);
  if (block !== null) {
    const isSpeech = block.node.type.name === PLAY_SPEECH_NODE;
    const from = isSpeech
      ? block.blockPosition + 1 + (block.node.firstChild?.nodeSize ?? 2)
      : block.blockPosition;
    const to = isSpeech
      ? block.blockPosition + block.node.nodeSize - 1
      : block.blockPosition + block.node.nodeSize;
    decorations.push(Decoration.node(from, to, { class: 'tmc-play-current' }));
  }
  return DecorationSet.create(state.doc, decorations);
}

/** The play mode extension. */
export const PlayMode = Extension.create<Record<string, never>, PlayModeStorage>({
  name: 'playMode',
  // Ahead of the paragraph's own Enter and the lists' Tab (TipTap's default priority is 100).
  priority: 1000,
  addStorage() {
    return {
      isPlay: false,
      castNames: [],
      activeSuggestion: { forName: '', index: 0 },
      dismissedFor: null,
      tabLeaves: false,
      namePlaceholder: '',
      addToCast: () => undefined,
    };
  },
  addKeyboardShortcuts() {
    /** A key handled only in a play. */
    const inPlay = (handler: (editor: Editor) => boolean) => () =>
      this.storage.isPlay && handler(this.editor);
    return {
      Enter: inPlay(handleEnter),
      Tab: inPlay((editor) => handleTab(editor, 1)),
      'Shift-Tab': inPlay((editor) => handleTab(editor, -1)),
      Backspace: inPlay(handleBackspace),
      Delete: inPlay(handleDelete),
      Escape: inPlay(handleEscape),
      ArrowDown: inPlay((editor) => moveSuggestion(editor, 1)),
      ArrowUp: inPlay((editor) => moveSuggestion(editor, -1)),
    };
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    const editor = this.editor;
    return [
      new Plugin({
        key: playModeKey,
        props: {
          handleTextInput: (_view, _from, _to, text) => {
            // Any typing means Tab is the block's again (Escape only lends it for one press).
            storage.tabLeaves = false;
            return storage.isPlay && handleTextInput(editor, text);
          },
          transformPasted: (slice, view) => (storage.isPlay ? playPaste(slice, view.state) : slice),
          decorations: (state) => playDecorations(state, storage),
        },
      }),
    ];
  },
});
