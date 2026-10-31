/**
 * The chapter picture block in the editor (story S1-E3-09; board 4.3, "Inserted picture").
 *
 * A picture is one block that can't be typed into (an atom): it holds the picture's ID and its
 * alt text, and nothing else, so the stored text only ever says `![alt text](picture:<ID>)`
 * (chapterMarkdown.ts). The editor draws it with ChapterPictureNodeView: the picture with its
 * check state, the alt text field and "Remove picture".
 * Pasted HTML never makes one (lib/pasteCleaning.ts removes pictures), so a picture only arrives
 * through Insert › Picture, after the upload and the rights confirmation.
 * Who uses it: editorExtensions.ts; PictureInsertDialog inserts it with insertChapterPicture().
 */
import { Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer, type Editor } from '@tiptap/react';

import { ChapterPictureNodeView } from '../components/ChapterPictureNodeView';

/** The node's name, as the converters and the editor's JSON write it. */
export const CHAPTER_PICTURE_NODE = 'chapterPicture';

/** The picture block. */
export const ChapterPictureNode = Node.create({
  name: CHAPTER_PICTURE_NODE,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      pictureId: { default: '' },
      alt: { default: '' },
    };
  },
  // Never read from pasted or dropped HTML: a picture must go through the upload and its check.
  parseHTML() {
    return [];
  },
  renderHTML() {
    return ['figure', { 'data-chapter-picture': '' }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChapterPictureNodeView);
  },
});

/**
 * Puts a picture where the cursor is, as its own block. When another picture is selected, the new
 * one goes after it rather than replacing it.
 *
 * @param editor - the chapter editor
 * @param picture - the picture's ID (from the upload) and the alt text the writer wrote
 */
export function insertChapterPicture(editor: Editor, picture: { pictureId: string; alt: string }) {
  const content = { type: CHAPTER_PICTURE_NODE, attrs: picture };
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    editor.chain().focus().insertContentAt(selection.to, content).run();
    return;
  }
  editor.chain().focus().insertContent(content).run();
}
