/**
 * usePostFormatting: what happens when a formatting button is pressed, or Ctrl+B or Ctrl+I is
 * typed, in a forum post's text box (bundle GAPS-16, part b; story S1-E8-02; board 5.2).
 *
 * It reads the box's text and selection, asks lib/postFormatting.ts for the change, hands the new
 * text to the form (onChange), and once the box shows it puts the focus back in the box with the
 * right words selected, so the writer can keep typing.
 * Who calls it: PostEditor. What it calls: applyPostFormat().
 */
import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';

import { applyPostFormat, type PostFormat, type TextSelection } from '../lib/postFormatting';
import { useForumsTranslation } from '../registerForumsTranslations';

/** The keys that format without the toolbar (with Ctrl, or Cmd on a Mac). */
const shortcutFormats: Record<string, PostFormat> = { b: 'bold', i: 'italic' };

/**
 * Formats the text box's selection.
 *
 * @param box - the text box
 * @param value - the text the form holds now
 * @param onChange - hands the new text to the form
 * @param longestPost - the most characters a post may have (PostEditor's longestPost)
 * @returns format(format) for the toolbar and onKeyDown for the box's shortcuts
 */
export function usePostFormatting(
  box: RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (value: string) => void,
  longestPost: number,
) {
  const { t } = useForumsTranslation();
  // The selection to put back once the box shows the new text.
  const pendingSelection = useRef<TextSelection | null>(null);

  // Step 3 (after the box redraws): focus it and select the words the change says.
  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    const element = box.current;
    if (selection === null || element === null || element.value !== selection.text) return;
    pendingSelection.current = null;
    element.focus();
    element.setSelectionRange(selection.start, selection.end);
  }, [box, value]);

  /** Steps 1 and 2: works out the change from the box's selection and hands it to the form. */
  function format(chosen: PostFormat) {
    const element = box.current;
    if (element === null) return;
    const after = applyPostFormat(
      { text: value, start: element.selectionStart, end: element.selectionEnd },
      chosen,
      t('editor.format.linkWords'),
    );
    // The marks never push a post past the longest one the server takes; the box's own limit
    // (maxLength) only stops typing, not a change made here.
    if (after.text.length > longestPost) return;
    pendingSelection.current = after;
    onChange(after.text);
  }

  /** Ctrl+B and Ctrl+I (Cmd on a Mac) in the box do what the Bold and Italic buttons do. */
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Never while an input method is still composing a letter.
    if (event.nativeEvent.isComposing) return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    const chosen = shortcutFormats[event.key.toLowerCase()];
    if (chosen === undefined) return;
    event.preventDefault();
    format(chosen);
  }

  return { format, onKeyDown };
}
