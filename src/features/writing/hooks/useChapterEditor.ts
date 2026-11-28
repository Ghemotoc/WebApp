/**
 * useChapterEditor: the TipTap editor for one chapter (story S1-E3-02a; ADR 0005).
 *
 * Who calls it: ChapterEditorPage. What it does: starts the editor with the chapter's stored
 * Markdown turned into a document (chapterMarkdown.ts), tells the autosave on every change,
 * gives back the body as Markdown whenever a save needs it, and cleans pasted HTML first
 * (lib/pasteCleaning.ts, S1-E3-02b). The link dialog is opened by
 * the toolbar's Link button and by Ctrl+K (editorExtensions.ts). In poem mode (MUST-2) it hands the
 * switch to the PoemMode extension and keeps each line's leading spaces on save (lib/poemMode.ts).
 * In a play (LAYOUTS-2) it hands the switch and the "Name" placeholder to the PlayMode extension,
 * turns the stored speeches and directions into play blocks when the chapter loads, and turns
 * them back into paragraphs when the writer switches the layout away from Play (playDocument.ts).
 * The stored Markdown is the same either way; the change of blocks is never saved on its own.
 */
import { useEditor, type Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';

import type { ChapterLayout } from '../api/chapters';

import {
  editorDocumentToMarkdown,
  markdownToEditorDocument,
  type EditorNode,
} from '../lib/chapterMarkdown';
import { chapterEditorExtensions } from '../lib/editorExtensions';
import { fromPlayDocument, toPlayDocument } from '../lib/playDocument';
import { keepLineIndents } from '../lib/poemMode';
import { cleanPastedHtml } from '../lib/pasteCleaning';

/** What the hook needs. */
export interface ChapterEditorOptions {
  /** The chapter body as stored (Markdown). */
  initialBody: string;
  /** The accessible name of the text area ("Chapter text"). */
  label: string;
  /** The words shown in a speech's empty name ("Name"), for a play (LAYOUTS-2). */
  namePlaceholder: string;
  /** Called on every edit, so the autosave knows there is something to save. */
  onChange: () => void;
  /** Called when the text loses focus, so the autosave can save at once. */
  onBlur: () => void;
  /** The chapter's layout (LAYOUTS-1): a poem keeps its lines, a play has its own blocks. */
  layout: ChapterLayout;
}

/**
 * The editor's document for stored Markdown in a layout: a play's speeches and directions become
 * play blocks, anything else is read as it is.
 *
 * @param markdown - the chapter body as stored
 * @param layout - the chapter's layout
 * @returns the document to show
 */
export function documentForLayout(markdown: string, layout: ChapterLayout): EditorNode {
  const document = markdownToEditorDocument(markdown);
  return layout === 'play' ? toPlayDocument(document) : document;
}

/**
 * Changes the blocks on screen when the layout changes: into play blocks for a play, back into
 * paragraphs when a play becomes prose or a poem. The words stay; nothing is saved by it.
 */
function useLayoutBlocks(editor: Editor | null, layout: ChapterLayout) {
  const shownLayout = useRef(layout);
  useEffect(() => {
    if (editor === null || shownLayout.current === layout) return;
    const wasPlay = shownLayout.current === 'play';
    shownLayout.current = layout;
    // Only a change to or from Play changes the blocks; prose and poems share theirs.
    if (!wasPlay && layout !== 'play') return;
    const document = editor.getJSON() as EditorNode;
    const next = layout === 'play' ? toPlayDocument(document) : fromPlayDocument(document);
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, layout]);
}

/**
 * Starts the editor.
 *
 * @returns editor (null until TipTap is ready), readBody (the text as Markdown), loadBody (show
 *   another version), isLinkDialogOpen and closeLinkDialog / openLinkDialog
 */
export function useChapterEditor({
  initialBody,
  label,
  namePlaceholder,
  onChange,
  onBlur,
  layout,
}: ChapterEditorOptions) {
  const [isLinkDialogOpen, setLinkDialogOpen] = useState(false);
  // A ref, so the extension list (built once) always reaches the latest opener.
  const openLinkDialogRef = useRef(() => setLinkDialogOpen(true));
  const editor: Editor | null = useEditor({
    extensions: chapterEditorExtensions({ openLinkDialog: () => openLinkDialogRef.current() }),
    content: documentForLayout(initialBody, layout),
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
  // Poem mode (MUST-2) and play mode (LAYOUTS-2): the extensions read the switch from their
  // storage on every key and paste.
  if (editor !== null) {
    editor.storage.poemMode.isPoem = layout === 'poem';
    editor.storage.playMode.isPlay = layout === 'play';
    editor.storage.playMode.namePlaceholder = namePlaceholder;
  }
  useLayoutBlocks(editor, layout);

  /** The body as the Markdown that is stored. */
  function readBody(): string {
    if (editor === null) return initialBody;
    const document = editor.getJSON() as EditorNode;
    // A poem keeps the spaces its lines start with, which Markdown would otherwise drop (MUST-2).
    return editorDocumentToMarkdown(layout === 'poem' ? keepLineIndents(document) : document);
  }

  /** Shows another version of the text (the conflict's "Keep the other version"). */
  function loadBody(markdown: string) {
    editor?.commands.setContent(documentForLayout(markdown, layout), { emitUpdate: false });
  }

  return {
    editor,
    readBody,
    loadBody,
    isLinkDialogOpen,
    openLinkDialog: () => setLinkDialogOpen(true),
    closeLinkDialog: () => setLinkDialogOpen(false),
  };
}
