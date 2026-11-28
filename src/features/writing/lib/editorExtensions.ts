/**
 * The TipTap extensions the chapter editor runs (story S1-E3-02a; ADR 0005).
 *
 * Only the allowed formatting exists in the editor, so nothing else can be typed or pasted in:
 * paragraphs, headings 2 and 3, bold, italic, quote, bullet and numbered lists, the scene
 * break, links (http, https, mailto; never opened by a click inside the editor) and chapter
 * pictures (S1-E3-09, chapterPictureNode.ts) and music and video cards (S1-E3-10,
 * chapterEmbedNode.ts), footnotes (BOOKS-D05b, chapterFootnoteNode.ts), poem mode (MUST-2, poemMode.ts), which keeps a poem's lines,
 * and the play's speeches and directions with play mode (LAYOUTS-2, playNodes.ts, playMode.ts). Code, strike-through and underline are switched off because the stored Markdown subset has no
 * place for them (CLAUDE.md rule 8).
 * Keyboard shortcuts follow board 4.3: Bold Ctrl+B and Italic Ctrl+I (TipTap's own), Heading
 * Ctrl+Alt+2, Quote Ctrl+Shift+9, List Ctrl+Shift+8, Link Ctrl+K, Scene break Ctrl+Enter, and
 * Footnote Ctrl+Alt+F (board D13, in chapterFootnoteNode.ts).
 * Who uses it: useChapterEditor (src/features/writing/hooks/).
 */
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { isAllowedLink } from './chapterMarkdown';
import { ChapterEmbedNode } from './chapterEmbedNode';
import { ChapterFootnoteNode } from './chapterFootnoteNode';
import { ChapterPictureNode } from './chapterPictureNode';
import { playNodes } from './playNodes';
import { PlayMode } from './playMode';
import { PoemMode } from './poemMode';

/** What the shortcut extension needs from the screen: a way to open the link dialog. */
export interface ChapterShortcutOptions {
  openLinkDialog: () => void;
}

/**
 * The board's shortcuts that TipTap doesn't ship by default.
 */
const ChapterShortcuts = Extension.create<ChapterShortcutOptions>({
  name: 'chapterShortcuts',
  addOptions() {
    return { openLinkDialog: () => undefined };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-9': () => this.editor.commands.toggleBlockquote(),
      'Mod-Enter': () => this.editor.commands.setHorizontalRule(),
      'Mod-k': () => {
        this.options.openLinkDialog();
        return true;
      },
    };
  },
});

/**
 * Builds the extension list.
 *
 * @param options - the link dialog opener
 * @returns the extensions, in the order TipTap wants them
 */
export function chapterEditorExtensions(options: ChapterShortcutOptions) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto'],
        // The same rule as the converters and the server: never javascript: or data:.
        isAllowedUri: (url) => isAllowedLink(url),
        // Links in stored text get these when displayed (rule 8); the editor keeps them too.
        HTMLAttributes: { rel: 'nofollow ugc noopener', target: '_blank' },
      },
    }),
    ChapterShortcuts.configure(options),
    // Pictures (S1-E3-09): only through Insert › Picture, never pasted.
    ChapterPictureNode,
    ChapterEmbedNode,
    // Footnotes (BOOKS-D05b): only through the toolbar's fn button or Ctrl+Alt+F, never pasted.
    ChapterFootnoteNode,
    // Poem mode (MUST-2): idle until the chapter is switched to a poem.
    PoemMode,
    // The play's blocks and play mode (LAYOUTS-2): idle until the chapter is a play.
    ...playNodes,
    PlayMode,
  ];
}
