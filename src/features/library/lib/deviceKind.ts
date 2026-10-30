/**
 * The kind of screen a reading place is saved on, for "You stopped … on your phone" (story
 * S1-E4-03; board 3.7 Library).
 *
 * Why the width and not the device: the width is all the app needs, and it says nothing about
 * who the reader is. No device name, model, browser or address is ever sent.
 * Who calls it: useSavedPlace (src/features/reading/hooks/), when it saves a place.
 */
import type { DeviceKind } from '../api/library';

/**
 * The kind of screen for a window width, at the same breakpoints the layout uses (CLAUDE.md
 * rule 21: phones under 768 px, tablets under 1100 px, computers above).
 *
 * @param windowWidth - the window's width in CSS pixels
 * @returns phone, tablet or computer
 */
export function deviceKindFor(windowWidth: number): DeviceKind {
  if (windowWidth < 768) return 'phone';
  if (windowWidth < 1100) return 'tablet';
  return 'computer';
}
