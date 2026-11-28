/**
 * PlayNameSuggestions: the names suggested under a speaker's name while it is typed (LAYOUTS-2;
 * board D14: "Mara · Enter", "Mrs Dobre", then "Add “M…” to the cast" in the link colour).
 *
 * A list box 256 px wide, 6 px under the name, on the solid box surface with the popover shadow;
 * each choice 40 px tall, the picked one on the tint with "Enter" at its right. Up and Down move
 * the pick and Enter takes it (playMode.ts), Escape closes the list, and a click takes a choice.
 * The text keeps the focus all the while: the editor points at the picked choice with
 * aria-activedescendant, so a screen reader reads it (WAI-ARIA combobox pattern, list
 * autocomplete).
 * Shown only from 1024 px: on phones the names sit above the keyboard instead (PlayNameBar).
 * Who uses it: EditorPaper. What it calls: pickSuggestion() and the editor's view to place it.
 */
import type { Editor } from '@tiptap/react';
import { useLayoutEffect, useState, type RefObject } from 'react';

import type { PlayCaret } from '../hooks/usePlayCaret';
import { useIsWideEditor } from '../hooks/useIsWideEditor';
import { pickSuggestion } from '../lib/playMode';
import { useEditorTranslation } from '../registerEditorTranslations';

/** What the list needs. */
export interface PlayNameSuggestionsProps {
  editor: Editor;
  caret: PlayCaret;
  /** The paper's text area, which the list is placed in. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/** The list's id, which the editor's aria-controls names. */
const LIST_ID = 'play-name-suggestions';

/** Where the list sits: under the name being typed, in the text area's own coordinates. */
function usePlace(
  editor: Editor,
  caret: PlayCaret,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const nameElement =
      caret.blockPosition < 0 ? null : editor.view.nodeDOM(caret.blockPosition + 1);
    const container = containerRef.current;
    if (!(nameElement instanceof HTMLElement) || container === null) {
      setPlace(null);
      return;
    }
    const nameBox = nameElement.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    setPlace({
      top: nameBox.bottom - containerBox.top + 6,
      left: nameBox.left - containerBox.left,
    });
  }, [editor, caret, containerRef]);
  return place;
}

/** Tells the editor which choice is picked, for screen readers, and clears it when the list goes. */
function useActiveDescendant(editor: Editor, activeId: string | null) {
  useLayoutEffect(() => {
    const textArea = editor.view.dom;
    if (activeId === null) {
      textArea.removeAttribute('aria-activedescendant');
      textArea.removeAttribute('aria-controls');
      return;
    }
    textArea.setAttribute('aria-controls', LIST_ID);
    textArea.setAttribute('aria-activedescendant', activeId);
  }, [editor, activeId]);
}

/**
 * Renders the list, while there is something to suggest.
 *
 * @returns the list box, or nothing
 */
export function PlayNameSuggestions({ editor, caret, containerRef }: PlayNameSuggestionsProps) {
  const { t } = useEditorTranslation();
  const isWide = useIsWideEditor();
  const place = usePlace(editor, caret, containerRef);
  const { items, activeIndex } = caret.suggestions;
  const isShown = isWide && editor.isFocused && items.length > 0 && place !== null;
  useActiveDescendant(editor, isShown ? `${LIST_ID}-${activeIndex}` : null);
  if (!isShown) return null;
  return (
    <div
      id={LIST_ID}
      role="listbox"
      aria-label={t('play.suggestions.label')}
      style={{ top: place.top, left: place.left }}
      className="box-surface absolute z-10 flex w-64 flex-col rounded-field p-1 shadow-popover"
    >
      {items.map((item, index) => {
        const isPicked = index === activeIndex;
        return (
          <button
            key={`${item.kind}-${item.name}`}
            type="button"
            id={`${LIST_ID}-${index}`}
            role="option"
            aria-selected={isPicked}
            // The text keeps the focus (Up, Down and Enter work there): a press picks without the
            // caret leaving the name, and Tab never stops on a choice.
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pickSuggestion(editor, item)}
            className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-field px-3 text-left font-body type-meta ${isPicked ? 'bg-tint' : ''} ${item.kind === 'add' ? 'font-semibold text-link' : 'font-semibold tracking-wide text-ink-heading uppercase'}`}
          >
            {item.kind === 'add' ? t('play.suggestions.add', { name: item.name }) : item.name}
            {isPicked && item.kind === 'cast' && (
              <span className="font-normal tracking-normal text-ink-muted normal-case">
                {t('play.suggestions.enter')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
