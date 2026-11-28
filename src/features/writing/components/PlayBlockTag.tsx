/**
 * PlayBlockTag: the tag at the right margin of the block with the caret, so the writer always
 * knows what Enter will do (LAYOUTS-2; board D14: "Character · Enter goes to the line").
 *
 * A small pill on the tint, at the top right of the block; the block's first line leaves room
 * for it (the `tmc-play-current` mark playMode.ts puts on the block, which the stylesheet gives a
 * float as wide as the tag, `--play-tag-width`), so it never covers the words. From 1024 px only;
 * on phones the toolbar's pressed button says the same.
 * The words are also said once to screen readers each time the block's kind changes (a polite
 * live region), since the pill itself is only drawn.
 * Who uses it: EditorPaper. What it calls: the editor's view to place it.
 */
import type { Editor } from '@tiptap/react';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

import type { PlayCaret } from '../hooks/usePlayCaret';
import { useIsWideEditor } from '../hooks/useIsWideEditor';
import { PLAY_SPEECH_NODE } from '../lib/playNodes';
import { useEditorTranslation } from '../registerEditorTranslations';

/** What the tag needs. */
export interface PlayBlockTagProps {
  editor: Editor;
  caret: PlayCaret;
  /** The paper's text area, which the tag is placed in. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/** The element the tag sits beside: a speech's line, or the block itself. */
function blockElement(editor: Editor, blockPosition: number): HTMLElement | null {
  const block = editor.state.doc.nodeAt(blockPosition);
  if (block === null) return null;
  const position =
    block.type.name === PLAY_SPEECH_NODE
      ? blockPosition + 1 + (block.firstChild?.nodeSize ?? 2)
      : blockPosition;
  const element = editor.view.nodeDOM(position);
  return element instanceof HTMLElement ? element : null;
}

/**
 * Renders the tag and its screen-reader line.
 *
 * @returns the pill beside the block, or only the live region when there is no block
 */
export function PlayBlockTag({ editor, caret, containerRef }: PlayBlockTagProps) {
  const { t } = useEditorTranslation();
  const isWide = useIsWideEditor();
  const tagRef = useRef<HTMLSpanElement>(null);
  const [top, setTop] = useState<number | null>(null);
  const words = caret.kind === null ? '' : t(`play.tags.${caret.kind}`);

  useLayoutEffect(() => {
    // Step 1: the block's top, in the text area's coordinates.
    const element = caret.blockPosition < 0 ? null : blockElement(editor, caret.blockPosition);
    const container = containerRef.current;
    if (element === null || container === null) {
      setTop(null);
      return;
    }
    setTop(element.getBoundingClientRect().top - container.getBoundingClientRect().top);
  }, [editor, caret, containerRef]);

  useLayoutEffect(() => {
    // Step 2: once drawn, the block's first line keeps room as wide as the tag (plus 16 px).
    const tagWidth = tagRef.current?.offsetWidth ?? 0;
    containerRef.current?.style.setProperty('--play-tag-width', `${tagWidth + 16}px`);
  }, [top, words, isWide, containerRef]);

  return (
    <>
      {isWide && top !== null && words !== '' && (
        <span
          ref={tagRef}
          aria-hidden="true"
          style={{ top: top + 6 }}
          className="pointer-events-none absolute right-0 z-[1] rounded-full bg-tint px-2 font-body type-meta font-semibold whitespace-nowrap text-ink-heading"
        >
          {words}
        </span>
      )}
      <p className="sr-only" aria-live="polite">
        {words}
      </p>
    </>
  );
}
