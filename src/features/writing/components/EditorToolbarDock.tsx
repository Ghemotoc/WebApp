/**
 * EditorToolbarDock: where the formatting bar sits (board D05, user story 5.5).
 *
 * From 1024 px it is simply the row above the paper. Below 1024 px it floats at the bottom of the
 * screen, 12 px in from each edge, and rises with the on-screen keyboard so it is always just
 * above it ("The formatting bar floats above the keyboard"; useKeyboardInset). The page keeps
 * room under the paper for it (ChapterEditorPage), so the last line never hides behind the bar.
 * Who uses it: ChapterEditorPage. What it calls: useKeyboardInset and EditorToolbar.
 */
import { useKeyboardInset } from '../hooks/useKeyboardInset';

import { EditorToolbar, type EditorToolbarProps } from './EditorToolbar';

/**
 * Renders the bar in its place for the screen's width.
 *
 * @returns the toolbar, docked
 */
export function EditorToolbarDock(props: EditorToolbarProps) {
  const keyboardInset = useKeyboardInset();
  return (
    <div
      data-testid="editor-toolbar-dock"
      // Below 1024 px: fixed to the bottom, lifted by the keyboard's height and the safe area.
      style={{ '--keyboard-inset': `${keyboardInset}px` } as React.CSSProperties}
      className="max-lg:fixed max-lg:inset-x-3 max-lg:bottom-[calc(12px+var(--keyboard-inset)+env(safe-area-inset-bottom))] max-lg:z-30 max-lg:shadow-popover max-lg:rounded-full"
    >
      <EditorToolbar {...props} />
    </div>
  );
}
