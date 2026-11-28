/**
 * A play's blocks and the stored Markdown (LAYOUTS-2; board D14; storage format in
 * docs/decisions.md, LAYOUTS-1): speeches and directions come back as play blocks, go back to the
 * same Markdown, and pasted text becomes speeches, directions and headings.
 */
import { describe, expect, it } from 'vitest';

import {
  editorDocumentToMarkdown,
  markdownToEditorDocument,
  type EditorNode,
} from './chapterMarkdown';
import {
  countPlayBlocks,
  fromPlayDocument,
  looksLikeCharacterName,
  pastedParagraphToPlay,
  playNameSuggestions,
  speechNode,
  toPlayDocument,
} from './playDocument';

/** The stored play the tests read: an act, a scene, two speeches and a direction. */
const storedPlay = [
  '## Act two',
  '### Scene one',
  '**MARA:** Who left the lights on?',
  '*The lift stops. Nothing opens.*',
  '**Mrs Dobre**: Altos *first*, please!',
].join('\n\n');

describe('toPlayDocument', () => {
  it('turns bold names with a colon into speeches and italic paragraphs into directions', () => {
    const blocks = toPlayDocument(markdownToEditorDocument(storedPlay)).content ?? [];
    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'heading',
      'playSpeech',
      'playDirection',
      'playSpeech',
    ]);
    expect(blocks[2]).toEqual(
      speechNode('MARA', [{ type: 'text', text: 'Who left the lights on?' }]),
    );
    // The direction is drawn in italics, so its words don't carry the mark in the editor.
    expect(blocks[3]?.content).toEqual([{ type: 'text', text: 'The lift stops. Nothing opens.' }]);
    // "**Mrs Dobre**: …" (the colon after the bold) is a speech too, its own italics kept.
    expect(blocks[4]?.content?.[0]?.content).toEqual([{ type: 'text', text: 'Mrs Dobre' }]);
    expect(blocks[4]?.content?.[1]?.content?.[1]).toEqual({
      type: 'text',
      text: 'first',
      marks: [{ type: 'italic' }],
    });
  });

  it('leaves an ordinary paragraph, and one that only starts in bold, as a paragraph', () => {
    const document = markdownToEditorDocument('Plain words.\n\n**Bold** words without a colon.');
    expect(toPlayDocument(document)).toEqual(document);
  });
});

describe('a play through a save and a load', () => {
  it('stores a speech as **NAME:** words and a direction in italics', () => {
    const document: EditorNode = {
      type: 'doc',
      content: [
        speechNode('Mara', [{ type: 'text', text: 'Fresh paint.' }]),
        { type: 'playDirection', content: [{ type: 'text', text: 'She laughs.' }] },
      ],
    };
    expect(editorDocumentToMarkdown(document)).toBe('**Mara:** Fresh paint.\n\n*She laughs.*');
  });

  it('comes back as the same blocks, so a second save changes nothing', () => {
    const document = toPlayDocument(markdownToEditorDocument(storedPlay));
    const saved = editorDocumentToMarkdown(document);
    expect(editorDocumentToMarkdown(toPlayDocument(markdownToEditorDocument(saved)))).toBe(saved);
  });

  it('keeps a speech without a name as its line, and drops an empty speech', () => {
    const document: EditorNode = {
      type: 'doc',
      content: [speechNode('', [{ type: 'text', text: 'Only words.' }]), speechNode('', [])],
    };
    expect(editorDocumentToMarkdown(document)).toBe('Only words.');
  });

  it('gives the same Markdown whether the blocks are a play or back to paragraphs', () => {
    const document = toPlayDocument(markdownToEditorDocument(storedPlay));
    expect(editorDocumentToMarkdown(fromPlayDocument(document))).toBe(
      editorDocumentToMarkdown(document),
    );
    expect(fromPlayDocument(document).content?.some((block) => block.type.startsWith('play'))).toBe(
      false,
    );
  });
});

/** A pasted paragraph of plain text. */
function pasted(text: string): EditorNode {
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

describe('pastedParagraphToPlay', () => {
  it('turns "NAME: words" into a speech', () => {
    expect(pastedParagraphToPlay(pasted('TEO: She’s coming down.'))).toEqual(
      speechNode('TEO', [{ type: 'text', text: 'She’s coming down.' }]),
    );
    expect(pastedParagraphToPlay(pasted('Mrs. Dobre: Altos!')).type).toBe('playSpeech');
  });

  it('turns a line in brackets into a direction, and Act and Scene lines into headings', () => {
    expect(pastedParagraphToPlay(pasted('(The lift stops.)')).type).toBe('playDirection');
    expect(pastedParagraphToPlay(pasted('ACT II: The mine'))).toMatchObject({
      type: 'heading',
      attrs: { level: 2 },
    });
    expect(pastedParagraphToPlay(pasted('Scena 3'))).toMatchObject({
      type: 'heading',
      attrs: { level: 3 },
    });
  });

  it('leaves a sentence with a colon, and an ordinary line, as a paragraph', () => {
    const sentence = pasted('It was late, and she knew one thing: the lift was gone.');
    expect(pastedParagraphToPlay(sentence)).toBe(sentence);
    const plain = pasted('Nothing happens.');
    expect(pastedParagraphToPlay(plain)).toBe(plain);
  });
});

describe('looksLikeCharacterName', () => {
  it('takes short names and refuses sentences, numbers and long runs of words', () => {
    expect(looksLikeCharacterName('Mara')).toBe(true);
    expect(looksLikeCharacterName('Mrs Dobre')).toBe(true);
    expect(looksLikeCharacterName('Ștefan cel Mare')).toBe(true);
    expect(looksLikeCharacterName('It was late, and she knew one thing')).toBe(false);
    expect(looksLikeCharacterName('12')).toBe(false);
    expect(looksLikeCharacterName('')).toBe(false);
  });
});

describe('countPlayBlocks', () => {
  it('counts lines and directions, and each name’s lines whatever its capitals', () => {
    const document: EditorNode = {
      type: 'doc',
      content: [
        speechNode('Mara', [{ type: 'text', text: 'One.' }]),
        speechNode('MARA', [{ type: 'text', text: 'Two.' }]),
        speechNode('Teo', []),
        { type: 'playDirection', content: [{ type: 'text', text: 'Dark.' }] },
      ],
    };
    const counts = countPlayBlocks(document);
    expect(counts.lines).toBe(3);
    expect(counts.directions).toBe(1);
    expect(counts.linesByName.get('mara')).toBe(2);
  });
});

describe('playNameSuggestions', () => {
  const cast = ['Mara', 'Teo', 'Mrs Dobre', 'Ilie'];

  it('lists the names that start with what is typed, then the offer to add it', () => {
    expect(playNameSuggestions('m', cast)).toEqual([
      { kind: 'cast', name: 'Mara' },
      { kind: 'cast', name: 'Mrs Dobre' },
      { kind: 'add', name: 'm' },
    ]);
  });

  it('finds a later word too, and offers no add for a name already in the cast', () => {
    expect(playNameSuggestions('dob', cast)).toEqual([
      { kind: 'cast', name: 'Mrs Dobre' },
      { kind: 'add', name: 'dob' },
    ]);
    expect(playNameSuggestions('teo', cast)).toEqual([{ kind: 'cast', name: 'Teo' }]);
  });

  it('suggests nothing while nothing is typed', () => {
    expect(playNameSuggestions('  ', cast)).toEqual([]);
  });
});
