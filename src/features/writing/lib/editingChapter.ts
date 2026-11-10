/**
 * Which chapter the editor on screen is editing (bundle GAPS-8).
 *
 * A picture or a music or video card inside the text is drawn by TipTap, not by the page, so it
 * can't be handed the chapter as a prop. The page puts the chapter's row ID here, and the blocks
 * read it when the writer replaces a picture or changes a card's link (a new upload or a new
 * card belongs to a chapter).
 * Who provides it: ChapterEditorPage, around the editor's text.
 * Who reads it: ChapterPictureNodeView and ChapterEmbedNodeView.
 */
import { createContext, useContext } from 'react';

/** The chapter's row ID, or null outside a chapter editor. */
export const EditingChapterContext = createContext<string | null>(null);

/**
 * Reads the chapter being edited.
 *
 * @returns the chapter's row ID, or null when no chapter editor is around the caller
 */
export function useEditingChapterId(): string | null {
  return useContext(EditingChapterContext);
}
