/**
 * ChapterFootnoteNodeView: a footnote's number inside the chapter editor (BOOKS-D05b; board
 * D13-EditorFootnotes, approved "as drawn").
 *
 * Board values: the number raised in a soft tint chip ("so the writer can see it is not typed
 * text"), in the main colour while its note is open; a button named "Footnote 2" with
 * aria-expanded, so a screen reader hears what it is and whether its note is showing. Pressing it
 * opens the note (FootnoteNotePanel, through the node's storage). The number is the footnote's
 * place among the chapter's footnotes, worked out again after every change to the text, so adding
 * a note before it renumbers it at once.
 * Who uses it: the chapterFootnote node (lib/chapterFootnoteNode.ts) through TipTap's React node
 * views. What it calls: footnoteNumberAt and the storage's openNote.
 */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useEffect, useState } from 'react';

import { footnoteNumberAt } from '../lib/chapterFootnoteNode';
import { useEditorTranslation } from '../registerEditorTranslations';

/** What the number shows: its number and whether its note is open. */
interface MarkerState {
  number: number;
  isOpen: boolean;
}

/**
 * Follows the footnote's number and open state through every change to the editor.
 *
 * @param props - the node view's props (editor and getPos)
 * @returns the number and whether the note is open
 */
function useMarkerState({ editor, getPos }: Pick<NodeViewProps, 'editor' | 'getPos'>): MarkerState {
  const [state, setState] = useState<MarkerState>({ number: 0, isOpen: false });
  useEffect(() => {
    /** Step 1: read the place, then the number and whether the open note is this one. */
    function update() {
      const position = getPos();
      if (position === undefined) return;
      setState({
        number: footnoteNumberAt(editor.state.doc, position),
        isOpen: editor.storage.chapterFootnote.openPosition === position,
      });
    }
    // Step 2: once now, then after every change (a note added earlier renumbers this one).
    update();
    editor.on('transaction', update);
    return () => {
      editor.off('transaction', update);
    };
  }, [editor, getPos]);
  return state;
}

/**
 * Renders the number.
 *
 * @returns the footnote's button, inline in the text
 */
export function ChapterFootnoteNodeView({ editor, getPos }: NodeViewProps) {
  const { t } = useEditorTranslation();
  const { number, isOpen } = useMarkerState({ editor, getPos });
  return (
    <NodeViewWrapper as="span" contentEditable={false} data-chapter-footnote="">
      <button
        type="button"
        className="tmc-footnote-marker"
        aria-label={t('footnote.label', { number })}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          const position = getPos();
          if (position !== undefined) editor.storage.chapterFootnote.openNote(position);
        }}
      >
        {number}
      </button>
    </NodeViewWrapper>
  );
}
