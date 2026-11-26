/**
 * Drops the one click a browser fires when a mouse drag ends (story S1-E3-04; board D03, user
 * story 5.3: the whole row is what a person drags, with no handle).
 *
 * Why: the dragged row follows the pointer, so when the button comes up the row's title link is
 * under it, and the browser sends that link a click. dnd-kit stops the click from reaching React,
 * which also stops React Router from handling it, so the browser follows the link itself and
 * opens the editor in a full page load. This listener, on the window and in the capture phase,
 * runs first and cancels the click's default action.
 * A drag cancelled with Escape fires no click, so the next press of a mouse button, a finger or
 * a key takes the listener away too: a later, real click on the title still opens the editor.
 * Who calls it: SortableChapterList, when a drag starts. What it calls: the window's listeners.
 */

/** The events that start a new interaction and so end the wait for the drag's own click. */
const FRESH_PRESSES = ['mousedown', 'touchstart', 'keydown'] as const;

/**
 * Cancels the next click on the page, unless a new press comes first.
 *
 * @returns nothing; the listeners remove themselves
 */
export function blockClickAfterDrag(): void {
  // Step 1: the click the drag ends with is cancelled and stops there.
  const cancelClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    stopWaiting();
  };
  // Step 2: either that click or a new press ends the wait, so nothing else is ever blocked.
  function stopWaiting() {
    window.removeEventListener('click', cancelClick, true);
    for (const type of FRESH_PRESSES) window.removeEventListener(type, stopWaiting, true);
  }
  window.addEventListener('click', cancelClick, true);
  for (const type of FRESH_PRESSES) window.addEventListener(type, stopWaiting, true);
}
