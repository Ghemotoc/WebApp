/**
 * Play mode's keys and typing in the real editor (LAYOUTS-2; board D14, the keys box: "Enter:
 * next block: a name, then its line", "Tab: change the block type", "(: at the start: a stage
 * direction", "NAME:: typed or pasted, becomes a line").
 */
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { editorDocumentToMarkdown, type EditorNode } from './chapterMarkdown';
import { chapterEditorExtensions } from './editorExtensions';
import {
  currentPlayBlock,
  putNameInSpeech,
  renameSpeeches,
  setPlayBlockKind,
} from './playCommands';
import { speechNode } from './playDocument';
import { visibleSuggestions } from './playMode';

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

/** A real editor in play mode, holding these blocks, the caret at the end. */
function playEditor(content: EditorNode[]): Editor {
  editor = new Editor({
    extensions: chapterEditorExtensions({ openLinkDialog: () => undefined }),
    content: { type: 'doc', content },
  });
  editor.storage.playMode.isPlay = true;
  editor.storage.playMode.castNames = ['Mara', 'Mrs Dobre'];
  editor.commands.focus('end');
  return editor;
}

/** Presses a key in the editor, the way the browser hands it to ProseMirror. */
function press(target: Editor, key: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  target.view.someProp('handleKeyDown', (handler) => handler(target.view, event));
}

/** Types text in the editor through its text input handlers, as the keyboard does. */
function type(target: Editor, text: string) {
  const { from, to } = target.state.selection;
  const handled = target.view.someProp('handleTextInput', (handler) =>
    handler(target.view, from, to, text, () => target.state.tr.insertText(text, from, to)),
  );
  if (handled !== true) target.view.dispatch(target.state.tr.insertText(text, from, to));
}

/** The kind of block the caret is in now. */
function kindNow(target: Editor) {
  return currentPlayBlock(target.state)?.kind;
}

describe('Enter in a play', () => {
  it('goes from a name to its line, then from the line to the next name', () => {
    const play = playEditor([speechNode('Teo', [])]);
    setPlayBlockKind(play, 'name');
    press(play, 'Enter');
    expect(kindNow(play)).toBe('line');
    type(play, 'She’s coming down.');
    press(play, 'Enter');
    expect(kindNow(play)).toBe('name');
    expect(editorDocumentToMarkdown(play.getJSON() as EditorNode)).toBe(
      '**Teo:** She’s coming down.',
    );
  });

  it('takes the suggested name first when Enter is pressed in a half-typed name', () => {
    const play = playEditor([speechNode('M', [])]);
    setPlayBlockKind(play, 'name');
    expect(visibleSuggestions(play).items[0]).toEqual({ kind: 'cast', name: 'Mara' });
    press(play, 'ArrowDown');
    press(play, 'Enter');
    expect(currentPlayBlock(play.state)?.node.firstChild?.textContent).toBe('Mrs Dobre');
    expect(kindNow(play)).toBe('line');
  });

  it('turns an empty speech into a direction, and an empty direction back into a speech', () => {
    const play = playEditor([speechNode('', [])]);
    setPlayBlockKind(play, 'name');
    press(play, 'Enter');
    expect(kindNow(play)).toBe('direction');
    press(play, 'Enter');
    expect(kindNow(play)).toBe('name');
  });

  it('does nothing different in prose', () => {
    const prose = playEditor([{ type: 'paragraph', content: [{ type: 'text', text: 'Words' }] }]);
    prose.storage.playMode.isPlay = false;
    type(prose, ':');
    expect(kindNow(prose)).toBe('text');
  });
});

describe('Tab and typing in a play', () => {
  it('moves through Character, Direction, Act and Scene, keeping the words', () => {
    const play = playEditor([speechNode('Mara', [{ type: 'text', text: 'Altos first' }])]);
    press(play, 'Tab');
    expect(kindNow(play)).toBe('direction');
    press(play, 'Tab');
    expect(kindNow(play)).toBe('act');
    press(play, 'Tab', true);
    expect(kindNow(play)).toBe('direction');
    expect(play.state.doc.textContent).toBe('Altos first');
  });

  it('lets Tab leave the text after Escape (no keyboard trap)', () => {
    const play = playEditor([speechNode('Mara', [])]);
    press(play, 'Escape');
    press(play, 'Tab');
    expect(kindNow(play)).toBe('line');
  });

  it('makes a direction when "(" is typed first in an empty speech', () => {
    const play = playEditor([speechNode('', [])]);
    setPlayBlockKind(play, 'name');
    type(play, '(');
    expect(kindNow(play)).toBe('direction');
    expect(play.state.doc.textContent).toBe('(');
  });

  it('makes a speech when a short name and a colon start a paragraph', () => {
    const play = playEditor([{ type: 'paragraph', content: [{ type: 'text', text: 'ILIE' }] }]);
    type(play, ':');
    expect(kindNow(play)).toBe('line');
    expect(currentPlayBlock(play.state)?.node.firstChild?.textContent).toBe('ILIE');
  });
});

describe('names in speeches', () => {
  it('puts a picked name in the speech and moves on to the line', () => {
    const play = playEditor([speechNode('m', [])]);
    setPlayBlockKind(play, 'name');
    expect(putNameInSpeech(play, 'Mara')).toBe(true);
    expect(kindNow(play)).toBe('line');
    expect(play.state.doc.textContent).toBe('Mara');
  });

  it('renames a character in every speech of the chapter', () => {
    const play = playEditor([
      speechNode('Mara', [{ type: 'text', text: 'One.' }]),
      speechNode('Teo', [{ type: 'text', text: 'Two.' }]),
      speechNode('MARA', [{ type: 'text', text: 'Three.' }]),
    ]);
    expect(renameSpeeches(play, 'mara', 'Marina')).toBe(2);
    expect(editorDocumentToMarkdown(play.getJSON() as EditorNode)).toBe(
      '**Marina:** One.\n\n**Teo:** Two.\n\n**Marina:** Three.',
    );
  });
});
