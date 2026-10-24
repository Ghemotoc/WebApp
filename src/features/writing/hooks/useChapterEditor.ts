/**
 * useChapterEditor: the TipTap editor for one chapter (story S1-E3-02a; ADR 0005).
 *
 * Who calls it: ChapterEditorPage. What it does: starts the editor with the chapter's stored
 * Markdown turned into a document (chapterMarkdown.ts), tells the autosave on every change,
 * gives back the body as Markdown whenever a save needs it, and cleans pasted HTML first
 * (lib/pasteCleaning.ts, S1-E3-02b). The link dialog is opened by
 * the toolbar's Link button and by Ctrl+K (editorExtensions.ts).
 */
import { useEditor, type Editor } from '@tiptap/react';
import { useRef, useState } from 'react';

import {
  editorDocumentToMarkdown,
  markdownToEditorDocument,
  type EditorNode,
} from '../lib/chapterMarkdown';
import { chapterEditorExtensions } from '../lib/editorExtensions';
import { cleanPastedHtml } from '../lib/pasteCleaning';

/** What the hook needs. */
export interface ChapterEditorOptions {
  /** The chapter body as stored (Markdown). */
  initialBody: string;
  /** The accessible name of the text area ("Chapter text"). */
  label: string;
  /** Called on every edit, so the autosave knows there is something to save. */
  onChange: () => void;
  /** Called when the text loses focus, so the autosave can save at once. */
  onBlur: () => void;
}

/**
 * Starts the editor.
 *
 * @returns editor (null until TipTap is ready), readBody (the text as Markdown),
 *   isLinkDialogOpen and closeLinkDialog / openLinkDialog
 */
export function useChapterEditor({ initialBody, label, onChange, onBlur }: ChapterEditorOptions) {
  const [isLinkDialogOpen, setLinkDialogOpen] = useState(false);
  // A ref, so the extension list (built once) always reaches the latest opener.
  const openLinkDialogRef = useRef(() => setLinkDialogOpen(true));
  const editor: Editor | null = useEditor({
    extensions: chapterEditorExtensions({ openLinkDialog: () => openLinkDialogRef.current() }),
    content: markdownToEditorDocument(initialBody),
    editorProps: {
      attributes: {
        'aria-label': label,
        'aria-multiline': 'true',
        role: 'textbox',
        class: 'mx-auto max-w-[680px]',
      },
      // Word, Google Docs and web pages: only the allowed formatting survives (S1-E3-02b).
      transformPastedHTML: cleanPastedHtml,
    },
    onUpdate: onChange,
    onBlur,
  });

  /** The body as the Markdown that is stored. */
  function readBody(): string {
    if (editor === null) return initialBody;
    return editorDocumentToMarkdown(editor.getJSON() as EditorNode);
  }

  return {
    editor,
    readBody,
    isLinkDialogOpen,
    openLinkDialog: () => setLinkDialogOpen(true),
    closeLinkDialog: () => setLinkDialogOpen(false),
  };
}
