/**
 * Poem mode keeps a poem's shape in the editor and through the stored Markdown (bundle MUST-2;
 * IDEA-20261106-1, criterion 1). The Enter tests drive the real editor with its real extensions.
 */
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import {
  editorDocumentToMarkdown,
  markdownToEditorDocument,
  type EditorNode,
} from './chapterMarkdown';
import { chapterEditorExtensions } from './editorExtensions';
import { keepLineIndents, poemTextToParagraphs } from './poemMode';

const NBSP = ' ';

/** The stored Markdown for a document, the way the editor saves a poem. */
function savedPoem(document: EditorNode): string {
  return editorDocumentToMarkdown(keepLineIndents(document));
}

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

/** A real editor holding one line of text, its cursor at the end, in poem mode or not. */
function editorWith(text: string, isPoem: boolean): Editor {
  editor = new Editor({
    extensions: chapterEditorExtensions({ openLinkDialog: () => undefined }),
    content: `<p>${text}</p>`,
  });
  editor.storage.poemMode.isPoem = isPoem;
  editor.commands.focus('end');
  return editor;
}

describe('poemTextToParagraphs', () => {
  it('makes one stanza per blank line and one line per line break', () => {
    const paragraphs = poemTextToParagraphs('Plouă\r\n  încet\n\n\nApoi tace.\n');
    expect(paragraphs).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Plouă' },
          { type: 'hardBreak' },
          { type: 'text', text: '  încet' },
        ],
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'Apoi tace.' }] },
    ]);
  });

  it('turns a tab into four spaces and gives nothing for empty text', () => {
    expect(poemTextToParagraphs('\tun vers')[0]?.content?.[0]?.text).toBe('    un vers');
    expect(poemTextToParagraphs('  \n \n')).toEqual([]);
  });
});

describe('keepLineIndents and the stored Markdown', () => {
  it('keeps the spaces each line starts with, and every line and stanza, through a save and a load', () => {
    const document: EditorNode = {
      type: 'doc',
      content: poemTextToParagraphs('Plouă pe acoperiș,\n    încet,\n  încet.\n\nApoi tace.'),
    };
    const markdown = savedPoem(document);
    expect(markdown).toBe(
      `Plouă pe acoperiș,  \n${NBSP.repeat(4)}încet,  \n${NBSP.repeat(2)}încet.\n\nApoi tace.`,
    );
    // Loading it back gives the same lines and indents, so a second save changes nothing.
    expect(savedPoem(markdownToEditorDocument(markdown))).toBe(markdown);
  });

  it('leaves spaces inside a line, lists and headings alone', () => {
    const document: EditorNode = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '  Titlu' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'un  vers' }] },
      ],
    };
    expect(keepLineIndents(document)).toEqual(document);
  });
});

describe('Enter in poem mode', () => {
  it('starts a new line in the same stanza, and a second Enter starts a new stanza', () => {
    const poem = editorWith('Primul vers', true);
    poem.commands.keyboardShortcut('Enter');
    poem.commands.insertContent('al doilea');
    expect(poem.getJSON().content).toHaveLength(1);
    poem.commands.keyboardShortcut('Enter');
    poem.commands.keyboardShortcut('Enter');
    poem.commands.insertContent('Strofa a doua');
    expect(editorDocumentToMarkdown(poem.getJSON() as EditorNode)).toBe(
      'Primul vers  \nal doilea\n\nStrofa a doua',
    );
  });

  it('leaves prose as it was: Enter is a new paragraph', () => {
    const prose = editorWith('Un paragraf', false);
    prose.commands.keyboardShortcut('Enter');
    prose.commands.insertContent('Altul');
    expect(editorDocumentToMarkdown(prose.getJSON() as EditorNode)).toBe('Un paragraf\n\nAltul');
  });
});
