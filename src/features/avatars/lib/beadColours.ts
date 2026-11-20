/**
 * beadColours: the colour of the plain circle behind a member's initials (bundle CALM-3, the
 * simplified design; Robert, 20 Nov 2026, 12:12 UTC: "a member who keeps their initials gets a
 * plain coloured circle, its colour picked at random from the cover palette, and they can change
 * it"; design system Avatar/README.md).
 *
 * Seven colours, all from the cover palette (coverPalette in src/components/covers/coverDesigns.ts,
 * never new hex codes): plum and violet carry paper initials, the five light ones ink initials,
 * every pair 9:1 or better. Every profile has one (profiles.initials_colour, picked at random when
 * the member joins, changed in Settings › Profile, Circle colour). Only a deleted account (no
 * username) or a profile whose colour can't be read falls back to a colour from its name, so the
 * same person still gets the same colour on every screen.
 * Who uses it: PersonAvatar, ProfileAvatar and InitialsColourSection. What it calls: coverPalette.
 */
import type { CSSProperties } from 'react';

import { coverPalette } from '@/components/covers/coverDesigns';

/**
 * The seven circle names, in a fixed order. The database's initials_colour_names() lists the same
 * names in the same order (supabase/tests/database/351-initials-colour.test.sql checks it).
 */
export const beadColourNames = ['plum', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage'] as const;

/** One of the seven circle names. */
export type BeadColourName = (typeof beadColourNames)[number];

/**
 * Whether a text is one of the seven circle names.
 *
 * @param text - a name read from the database
 * @returns true for a known colour
 */
export function isBeadColourName(text: string): text is BeadColourName {
  return (beadColourNames as readonly string[]).includes(text);
}

/** One circle: its colour and the colour of the initials on it. */
export interface BeadColour {
  name: BeadColourName;
  background: string;
  initials: string;
}

/** Paper initials, for the two dark circles (plum and violet). */
const paperInitials = coverPalette.paper;
/** Ink initials, for the five light circles. */
const inkInitials = coverPalette.ink;

/** The plum circle, first in the list and the fallback. */
const plumBead: BeadColour = {
  name: 'plum',
  background: coverPalette.plum,
  initials: paperInitials,
};

/**
 * The seven circles, in the order of beadColourNames. beadColours.test.ts checks the order and
 * that every pair reaches 4.5:1 (WCAG 1.4.3; the design system measures 9:1 or more).
 */
export const beadColours: readonly BeadColour[] = [
  plumBead,
  { name: 'violet', background: coverPalette.violet, initials: paperInitials },
  { name: 'gold', background: coverPalette.gold, initials: inkInitials },
  { name: 'lilac', background: coverPalette.lilac, initials: inkInitials },
  { name: 'blush', background: coverPalette.blush, initials: inkInitials },
  { name: 'sky', background: coverPalette.sky, initials: inkInitials },
  { name: 'sage', background: coverPalette.sage, initials: inkInitials },
];

/**
 * Picks the circle for a person: their stored colour, or else (a deleted account, or a colour that
 * couldn't be read) a simple sum of the key's character codes, so the same key always gives the
 * same circle.
 *
 * @param key - the username, or the name when there is no username
 * @param stored - the person's colour (profiles.initials_colour), or null when there is none to read
 * @returns the circle's colours
 */
export function beadColourFor(key: string, stored: BeadColourName | null = null): BeadColour {
  // Step 1: the person's own colour wins.
  const chosen = beadColours.find((bead) => bead.name === stored);
  if (chosen !== undefined) return chosen;
  // Step 2: add up the character codes (any stable spread will do; this one is easy to read).
  let total = 0;
  for (const character of key.toLowerCase()) {
    total += character.codePointAt(0) ?? 0;
  }
  // Step 3: wrap the total round the list.
  return beadColours[total % beadColours.length] ?? plumBead;
}

/**
 * The inline style that paints a circle: the avatar-bead class in index.css reads these two
 * custom properties.
 *
 * @param key - the username, or the name when there is no username
 * @param stored - the person's colour, or null
 * @returns the style for the circle's element
 */
export function beadStyleFor(key: string, stored: BeadColourName | null = null): CSSProperties {
  const bead = beadColourFor(key, stored);
  return { '--bead': bead.background, '--bead-initials': bead.initials } as CSSProperties;
}
