/**
 * The music and video card block in the editor (story S1-E3-10; board 4.3, the video card).
 *
 * A card is one block that can't be typed into (an atom): it holds the card's ID and its title,
 * and nothing else, so the stored text only ever says `![title](embed:<ID>)` (chapterMarkdown.ts).
 * The editor draws it with ChapterEmbedNodeView: the service, the title, what readers see and
 * "Remove". Pasted HTML never makes one (parseHTML returns nothing), so a card only arrives
 * through Insert › Music or Insert › Video, after our server checked the link.
 * Who uses it: editorExtensions.ts; EmbedInsertDialog inserts it with insertChapterEmbed().
 */
import { Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer, type Editor } from '@tiptap/react';

import { ChapterEmbedNodeView } from '../components/ChapterEmbedNodeView';

/** The node's name, as the converters and the editor's JSON write it. */
export const CHAPTER_EMBED_NODE = 'chapterEmbed';

/** The card block. */
export const ChapterEmbedNode = Node.create({
  name: CHAPTER_EMBED_NODE,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      embedId: { default: '' },
      title: { default: '' },
    };
  },
  // Never read from pasted or dropped HTML: a card must go through /api/embed.
  parseHTML() {
    return [];
  },
  renderHTML() {
    return ['div', { 'data-chapter-embed': '' }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChapterEmbedNodeView);
  },
});

/**
 * Puts a card where the cursor is, as its own block. When a picture or card is selected, the new
 * one goes after it rather than replacing it.
 *
 * @param editor - the chapter editor
 * @param card - the card's ID (from /api/embed) and its title
 */
export function insertChapterEmbed(editor: Editor, card: { embedId: string; title: string }) {
  const content = { type: CHAPTER_EMBED_NODE, attrs: card };
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    editor.chain().focus().insertContentAt(selection.to, content).run();
    return;
  }
  editor.chain().focus().insertContent(content).run();
}
