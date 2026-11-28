/**
 * The play layout's blocks in the chapter editor (LAYOUTS-2; board D14-EditorPlay).
 *
 * A play is written in four kinds of block, the board's "Act or scene", "Character", "Line" and
 * "Direction":
 * - acts and scenes are the editor's ordinary headings (level 2 an act, level 3 a scene);
 * - a speech (playSpeech) is one block holding the speaker's name (playName, plain text only)
 *   beside their line (playLine, which takes bold, italic, links and footnotes like a paragraph);
 * - a stage direction (playDirection) is a block of its own, drawn in italics.
 * The nodes always exist in the editor, so a document can hold them while the chapter is a play;
 * prose and poems never make them (playDocument.ts turns them back into paragraphs when the
 * layout changes, and on every save).
 * The stylesheet draws them (src/styles/index.css, "the play layout"): the name in a 148 px column
 * at the left of its line, above it on phones, and the direction indented to the line's edge.
 * Who uses it: editorExtensions.ts. The keys and the paste rules are in playMode.ts.
 */
import { Node } from '@tiptap/core';

/** The node names, as the editor's JSON and playDocument.ts write them. */
export const PLAY_SPEECH_NODE = 'playSpeech';
export const PLAY_NAME_NODE = 'playName';
export const PLAY_LINE_NODE = 'playLine';
export const PLAY_DIRECTION_NODE = 'playDirection';

/** A speech: the name, then its line, always both (an empty name is still a place to type one). */
export const PlaySpeechNode = Node.create({
  name: PLAY_SPEECH_NODE,
  group: 'block',
  content: `${PLAY_NAME_NODE} ${PLAY_LINE_NODE}`,
  // The caret stays inside: pasting or splitting never leaves half a speech behind.
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-play-speech]' }];
  },
  renderHTML() {
    return ['div', { class: 'tmc-play-say', 'data-play-speech': '' }, 0];
  },
});

/** The speaker's name: plain text, never bold or a link (the name column draws it). */
export const PlayNameNode = Node.create({
  name: PLAY_NAME_NODE,
  content: 'text*',
  marks: '',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-play-name]' }];
  },
  renderHTML() {
    return ['div', { class: 'tmc-play-who', 'data-play-name': '' }, 0];
  },
});

/** The words a character says: inline content like a paragraph's. */
export const PlayLineNode = Node.create({
  name: PLAY_LINE_NODE,
  content: 'inline*',
  defining: true,
  parseHTML() {
    // Ahead of the paragraph's own "p" rule (priority 50).
    return [{ tag: 'p[data-play-line]', priority: 60 }];
  },
  renderHTML() {
    return ['p', { class: 'tmc-play-line', 'data-play-line': '' }, 0];
  },
});

/** A stage direction: a paragraph of its own, drawn in italics at the line's edge. */
export const PlayDirectionNode = Node.create({
  name: PLAY_DIRECTION_NODE,
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'p[data-play-direction]', priority: 60 }];
  },
  renderHTML() {
    return ['p', { class: 'tmc-play-direction', 'data-play-direction': '' }, 0];
  },
});

/** The four nodes, in the order the extension list takes them. */
export const playNodes = [PlaySpeechNode, PlayNameNode, PlayLineNode, PlayDirectionNode];
