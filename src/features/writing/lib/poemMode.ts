/**
 * Poem mode in the chapter editor (bundle MUST-2; IDEA-20261106-1; story S1-E3-02).
 *
 * A poet's shape is the poem: every line break, the blank line between stanzas and the spaces a
 * line starts with. In poem mode:
 * - Enter starts a new line in the same stanza (a hard break); Enter on a line that is still
 *   empty turns it into the gap before a new stanza (a new paragraph). Shift+Enter is a new line
 *   as always. Lists, quotes and headings keep their usual Enter.
 * - Pasted plain text keeps its lines: one line break is a new line, a blank line a new stanza,
 *   and a tab becomes four spaces.
 * - On save, the spaces a line starts with become non-breaking spaces, because Markdown drops
 *   ordinary ones there (keepLineIndents). They read the same everywhere the text is shown.
 * The switch itself is stored per chapter (chapters.is_poem); the editor learns it through the
 * extension's storage (editor.storage.poemMode.isPoem).
 * Who uses it: editorExtensions.ts (the extension), useChapterEditor (keepLineIndents on save),
 * usePoemMode (sets the switch).
 */
import { Extension } from '@tiptap/core';
import { Fragment, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import type { EditorNode } from './chapterMarkdown';

/** What the extension remembers: whether the chapter being edited is a poem. */
export interface PoemModeStorage {
  isPoem: boolean;
}

declare module '@tiptap/core' {
  interface Storage {
    poemMode: PoemModeStorage;
  }
}

/** A non-breaking space: Markdown keeps it at the start of a line, where it drops a space. */
const NON_BREAKING_SPACE = ' ';

/** Four spaces for a pasted tab, the usual width of one indent in a poem. */
const TAB_AS_SPACES = '    ';

/**
 * One line of a pasted poem as editor nodes: its text, or nothing for an empty line.
 *
 * @param line - one line, without its line break
 * @returns a text node, or no node
 */
function lineNodes(line: string): EditorNode[] {
  const text = line.replace(/\t/g, TAB_AS_SPACES).replace(/\s+$/, '');
  return text === '' ? [] : [{ type: 'text', text }];
}

/**
 * Turns pasted plain text into stanzas: a blank line between stanzas, one line break per line.
 *
 * @param text - the pasted text, with \n, \r\n or \r line breaks
 * @returns one paragraph per stanza, its lines joined by hard breaks; none for empty text
 */
export function poemTextToParagraphs(text: string): EditorNode[] {
  // Step 1: one kind of line break, then the stanzas, split on lines that are empty or spaces.
  const stanzas = text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/);
  const paragraphs: EditorNode[] = [];
  for (const stanza of stanzas) {
    // Step 2: each stanza's lines without the empty ones at its start and end (a pasted text
    // often ends with a line break), with a hard break between two lines.
    const content: EditorNode[] = [];
    const lines = stanza.split('\n');
    while (lines.length > 0 && (lines[0] ?? '').trim() === '') lines.shift();
    while (lines.length > 0 && (lines.at(-1) ?? '').trim() === '') lines.pop();
    lines.forEach((line, index) => {
      if (index > 0) content.push({ type: 'hardBreak' });
      content.push(...lineNodes(line));
    });
    const hasWords = content.some((node) => node.type === 'text');
    if (hasWords) paragraphs.push({ type: 'paragraph', content });
  }
  return paragraphs;
}

/**
 * The spaces at the start of a text run turned into non-breaking spaces.
 *
 * @param text - a run of text that starts a line
 * @returns the same text, its leading spaces kept as non-breaking spaces
 */
function keepLeadingSpaces(text: string): string {
  const leading = /^ +/.exec(text)?.[0] ?? '';
  return NON_BREAKING_SPACE.repeat(leading.length) + text.slice(leading.length);
}

/**
 * One paragraph with every line's leading spaces kept: the first text after the start or after a
 * hard break begins a line.
 *
 * @param paragraph - a paragraph node
 * @returns a copy with those spaces made non-breaking
 */
function paragraphWithIndents(paragraph: EditorNode): EditorNode {
  let startsLine = true;
  const content = (paragraph.content ?? []).map((node) => {
    if (node.type === 'hardBreak') {
      startsLine = true;
      return node;
    }
    if (node.type !== 'text' || !startsLine) return node;
    startsLine = false;
    return { ...node, text: keepLeadingSpaces(node.text ?? '') };
  });
  return { ...paragraph, content };
}

/**
 * Keeps a poem's indents through Markdown: in each top-level paragraph (a stanza), the spaces
 * each line starts with become non-breaking spaces. Lists, quotes and headings are left as they
 * are.
 *
 * @param document - the editor's document
 * @returns a copy ready for editorDocumentToMarkdown()
 */
export function keepLineIndents(document: EditorNode): EditorNode {
  const content = (document.content ?? []).map((node) =>
    node.type === 'paragraph' ? paragraphWithIndents(node) : node,
  );
  return { ...document, content };
}

/** The key of the paste plugin, so it can be found in the editor's state when debugging. */
const poemPasteKey = new PluginKey('poemPaste');

/**
 * The poem mode extension: Enter for a new line, a second Enter for a new stanza, and pasted
 * lines kept. It does nothing while storage.isPoem is false, so prose editing is unchanged.
 */
export const PoemMode = Extension.create<Record<string, never>, PoemModeStorage>({
  name: 'poemMode',
  // Ahead of the paragraph's own Enter (TipTap's default priority is 100).
  priority: 1000,
  addStorage() {
    return { isPoem: false };
  },
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // Step 1: only in poem mode, and only in a stanza (a paragraph at the top of the text).
        if (!this.storage.isPoem) return false;
        const { $from, empty } = editor.state.selection;
        if ($from.depth !== 1 || $from.parent.type.name !== 'paragraph') return false;
        // Step 2: an empty stanza splits as usual, so a new poem starts cleanly.
        if ($from.parent.content.size === 0) return false;
        // Step 3: Enter on a line that is still empty: that line becomes the gap between stanzas.
        if (empty && $from.nodeBefore?.type.name === 'hardBreak') {
          return editor
            .chain()
            .deleteRange({ from: $from.pos - 1, to: $from.pos })
            .splitBlock()
            .run();
        }
        // Step 4: otherwise a new line in the same stanza.
        return editor.commands.setHardBreak();
      },
    };
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: poemPasteKey,
        props: {
          // Plain text pasted into a poem keeps its lines and stanzas; in prose, ProseMirror's
          // own parser runs (an undefined answer hands over to it).
          clipboardTextParser: (text, _context, _plain, view) => {
            if (!storage.isPoem) return undefined as unknown as Slice;
            const schema = view.state.schema;
            const nodes = poemTextToParagraphs(text).map((paragraph) =>
              schema.nodeFromJSON(paragraph),
            );
            return new Slice(Fragment.fromArray(nodes), 1, 1);
          },
        },
      }),
    ];
  },
});
