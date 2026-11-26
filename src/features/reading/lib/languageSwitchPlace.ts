/**
 * languageSwitchPlace: carries the reader's paragraph across a change of language, so "Read in"
 * opens the same chapter at the same paragraph (BOOKS B07, user story 2.7; board B07).
 *
 * How: when a reader picks another language in the reader, ReadInSwitch asks firstBlockInView()
 * which paragraph is at the top of the screen and sends its number in the navigation's state
 * ({ languageSwitch: { block } }); the history entry keeps it, never the address, so nothing about
 * the reader's place is shared in a link. On the new page, languageSwitchFrom() reads it back and
 * LanguageSwitchNote scrolls to that paragraph (blockAtOrBefore()). A translation keeps the
 * original's paragraphs in order (the side-by-side translator works paragraph by paragraph), so
 * the same number is the same place; when the translation has fewer, the last one before it is used.
 * Paragraphs are ChapterText's blocks, marked data-block="1", "2" … (src/lib/chapter-blocks.ts).
 * Who calls it: ReadInSwitch, ChapterReading and LanguageSwitchNote.
 */

/** What a change of language puts in the navigation's state. */
export interface LanguageSwitchState {
  languageSwitch: {
    /** The paragraph that was at the top of the screen, counted from 1; null at the very top. */
    block: number | null;
  };
}

/** Space the bars take at the top of the screen; a paragraph hidden behind them doesn't count. */
const barsHeight = 120;

/**
 * The chapter's paragraphs on screen, in order.
 *
 * @returns each block's element with its number
 */
function chapterBlocks(): { element: HTMLElement; block: number }[] {
  const elements = document.querySelectorAll<HTMLElement>('.tmc-chapter-text [data-block]');
  return Array.from(elements, (element) => ({
    element,
    block: Number(element.getAttribute('data-block')),
  })).filter((entry) => Number.isInteger(entry.block) && entry.block > 0);
}

/**
 * The paragraph the reader is looking at: the first whose bottom is below the bars.
 *
 * @returns its number, or null when the reader is still above the first paragraph
 */
export function firstBlockInView(): number | null {
  for (const { element, block } of chapterBlocks()) {
    if (element.getBoundingClientRect().bottom > barsHeight) {
      // The first paragraph means "the start": nothing to scroll to on the other side.
      return block === 1 ? null : block;
    }
  }
  return null;
}

/**
 * The paragraph to scroll to: the one asked for, or the last one before it when the
 * translation is shorter.
 *
 * @param wanted - the paragraph's number
 * @returns its element, or null while the text isn't drawn
 */
export function blockAtOrBefore(wanted: number): HTMLElement | null {
  let found: HTMLElement | null = null;
  for (const { element, block } of chapterBlocks()) {
    if (block > wanted) break;
    found = element;
  }
  return found;
}

/**
 * Reads a change of language back from the navigation's state.
 *
 * @param state - useLocation().state, whatever it holds
 * @returns the change, or null when the page wasn't opened from "Read in"
 */
export function languageSwitchFrom(state: unknown): LanguageSwitchState['languageSwitch'] | null {
  if (typeof state !== 'object' || state === null || !('languageSwitch' in state)) return null;
  const change: unknown = state.languageSwitch;
  if (typeof change !== 'object' || change === null || !('block' in change)) return null;
  const block = change.block;
  return {
    block: typeof block === 'number' && Number.isInteger(block) && block > 0 ? block : null,
  };
}
