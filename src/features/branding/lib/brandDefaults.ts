/**
 * brandDefaults: what the app shows when a brand slot is empty (bundle BRAND-1).
 *
 * The emblem's default is the cat Nicole Salazar drew (2 Nov 2026), kept as a placeholder until
 * the new logo is chosen (Robert, 4 Nov 2026, 14:25 UTC: "the one Nicole made as a placeholder,
 * but we will modify"). It is two SVG files in public/brand/, coloured with the light and night
 * heading colours (--heading in src/styles/tokens.css). A logo slot has no picture by default:
 * the product name as text, from the brand config, is the logo.
 * Who reads it: BrandSlotCard (the staff preview) and, from part b, the app shell.
 */
import type { BrandSlot } from '../api/brandAssets';

/** The bundled file for each slot, or null when the default is the product name as text. */
export const defaultBrandPicture: Record<BrandSlot, string | null> = {
  logo_light: null,
  logo_dark: null,
  emblem_light: '/brand/emblem-light.svg',
  emblem_dark: '/brand/emblem-dark.svg',
};

/**
 * Whether a slot is for the night theme.
 *
 * @param slot - the slot
 * @returns true for logo_dark and emblem_dark
 */
export function isNightSlot(slot: BrandSlot): boolean {
  return slot.endsWith('_dark');
}
