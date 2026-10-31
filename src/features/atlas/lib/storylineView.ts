/**
 * storylineView: which storyline view the writer looked at last on this device (story
 * S1-E17-22: "when the storyline opens, then it shows my last choice").
 *
 * Kept in the browser's storage, a per-device convenience like the last planned story
 * (lastPlannedStory.ts). Storage can be off or full: then the board opens, and nothing breaks.
 * Who calls it: components/StorylinePage.tsx. What it calls: localStorage.
 */

/** The three views. */
export const storylineViews = ['board', 'timeline', 'lanes'] as const;
export type StorylineView = (typeof storylineViews)[number];

/** The storage key. */
const viewKey = 'atlas-storyline-view';

/**
 * Reads the last view.
 *
 * @returns the view chosen last, or the board when there is none or storage can't be read
 */
export function readStorylineView(): StorylineView {
  try {
    const saved = window.localStorage.getItem(viewKey);
    const known = storylineViews.find((view) => view === saved);
    return known ?? 'board';
  } catch {
    // Storage is blocked (a private window, site data off): open the board.
    return 'board';
  }
}

/**
 * Remembers a view.
 *
 * @param view - the view just chosen
 */
export function rememberStorylineView(view: StorylineView): void {
  try {
    window.localStorage.setItem(viewKey, view);
  } catch {
    // Storage is blocked: the choice simply isn't remembered on this device.
  }
}
