/**
 * beadColours: the colour of a member's initials bead (bundle G3 COMPONENTS; design rules
 * 2026-11-07, "Initials colours": the brand colours plus cobalt, forest, indigo, ember, berry,
 * cherry and slate; light beads carry dark initials #26142E so they stay at 4.5:1 or better).
 *
 * Every member without a drawn avatar shows their initials on a glass bead. The bead's colour is
 * the one they picked in Settings › Profile (bundle G11a, profiles.initials_colour), or else comes
 * from their username (or name, for a deleted account), so the same person always has the same
 * colour on every screen and every device, and a page of comments is not all one plum.
 * Who uses it: PersonAvatar, ProfileAvatar and InitialsColourSection. What it calls: nothing.
 */
import type { CSSProperties } from 'react';

/**
 * The sixteen bead names, in a fixed order (changing the order would change everyone's colour).
 * The database's initials_colour_names() lists the same names in the same order.
 */
export const beadColourNames = [
  'plum',
  'violet',
  'ink',
  'gold',
  'blush',
  'sky',
  'sage',
  'lilac',
  'paper',
  'cobalt',
  'forest',
  'indigo',
  'ember',
  'berry',
  'cherry',
  'slate',
] as const;

/** One of the sixteen bead names. */
export type BeadColourName = (typeof beadColourNames)[number];

/**
 * Whether a text is one of the sixteen bead names.
 *
 * @param text - a name read from the database
 * @returns true for a known bead
 */
export function isBeadColourName(text: string): text is BeadColourName {
  return (beadColourNames as readonly string[]).includes(text);
}

/** One bead: its colour and the colour of the initials on it. */
export interface BeadColour {
  name: BeadColourName;
  background: string;
  initials: string;
}

/** White initials, for the dark beads. */
const lightInitials = '#FFFFFF';
/** The handoff's dark initials, for the light beads. */
const darkInitials = '#26142E';

/** The plum bead, first in the list and the fallback. */
const plumBead: BeadColour = { name: 'plum', background: '#4D1B5E', initials: lightInitials };

/**
 * The sixteen beads, in the order of beadColourNames. beadColours.test.ts checks the order and
 * that every pair reaches 4.5:1 (WCAG 1.4.3).
 */
export const beadColours: readonly BeadColour[] = [
  plumBead,
  { name: 'violet', background: '#6B3FA0', initials: lightInitials },
  { name: 'ink', background: '#2E2440', initials: lightInitials },
  { name: 'gold', background: '#E6C24C', initials: darkInitials },
  { name: 'blush', background: '#F4C6D0', initials: darkInitials },
  { name: 'sky', background: '#BFDDF2', initials: darkInitials },
  { name: 'sage', background: '#C9DDC0', initials: darkInitials },
  { name: 'lilac', background: '#DCC8EE', initials: darkInitials },
  { name: 'paper', background: '#F4EEE4', initials: darkInitials },
  { name: 'cobalt', background: '#1F4FA8', initials: lightInitials },
  { name: 'forest', background: '#2F5D3A', initials: lightInitials },
  { name: 'indigo', background: '#3B3F9E', initials: lightInitials },
  { name: 'ember', background: '#A8431C', initials: lightInitials },
  { name: 'berry', background: '#8C1F5A', initials: lightInitials },
  { name: 'cherry', background: '#A11D33', initials: lightInitials },
  { name: 'slate', background: '#44515E', initials: lightInitials },
];

/**
 * Picks the bead for a person: the colour they picked, or else a simple sum of the key's character
 * codes, so the same key always gives the same bead.
 *
 * @param key - the username, or the name when there is no username
 * @param picked - the colour the person picked (profiles.initials_colour), or null
 * @returns the bead's colours
 */
export function beadColourFor(key: string, picked: BeadColourName | null = null): BeadColour {
  // Step 1: a colour the person picked wins.
  const chosen = beadColours.find((bead) => bead.name === picked);
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
 * The inline style that paints a bead: the avatar-bead class in index.css reads these two custom
 * properties.
 *
 * @param key - the username, or the name when there is no username
 * @param picked - the colour the person picked, or null
 * @returns the style for the bead's element
 */
export function beadStyleFor(key: string, picked: BeadColourName | null = null): CSSProperties {
  const bead = beadColourFor(key, picked);
  return { '--bead': bead.background, '--bead-initials': bead.initials } as CSSProperties;
}
