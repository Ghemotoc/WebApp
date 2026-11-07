/**
 * The choices the avatar builder offers, part by part (bundle ADMIN-2, part g; Robert's brief of
 * 2 Nov 2026, section 7: "Offer a full range of skin tones, no gendered default and no free
 * text"; bundle AVATAR-1, 6 Nov 2026: the Micah art, picked by Robert at 11:09 UTC, where every
 * hairstyle takes any colour).
 *
 * The shapes are the Micah art's own names (@dicebear/micah, art CC BY 4.0 by Micah Lanier; ADR
 * 0014). Each choice's name on screen is `avatars.<part>.<value>` in the locale files. Colours
 * are six hex digits; the database checks the same shape (avatar_recipe_valid()).
 * The parts are grouped into the editor's tabs (avatarTabs), and each part is either a row of
 * picture tiles (a shape) or a row of round swatches (a colour). The background colour sits under
 * the tabs instead (avatarPartsUnderTabs), and the top and its colour are no longer offered
 * (avatarPartsNotOffered; Robert, 7 Nov 2026).
 * Who uses it: the editor (AvatarEditorTabs, AvatarPartTiles, AvatarColourSwatches),
 * randomRecipe (Surprise me) and drawAvatar.
 */
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

/** The parts that are shapes, drawn as picture tiles. */
export const avatarShapeParts = [
  'hair',
  'eyebrows',
  'eyes',
  'mouth',
  'nose',
  'facialHair',
  'glasses',
  'earrings',
  'shirt',
] as const;

/** The parts that are colours, drawn as round swatches. */
export const avatarColourParts = [
  'skin',
  'hairColour',
  'extrasColour',
  'shirtColour',
  'background',
] as const;

/** Every part the builder lets a person choose. */
export const avatarParts = [...avatarShapeParts, ...avatarColourParts] as const;

/** One part's name. */
export type AvatarPart = (typeof avatarParts)[number];

/** A shape part's name. */
export type AvatarShapePart = (typeof avatarShapeParts)[number];

/** A colour part's name. */
export type AvatarColourPart = (typeof avatarColourParts)[number];

/** The editor's tabs and the parts on each, in order (Robert, 6 Nov 2026: "not with dropdowns"). */
export const avatarTabs = [
  { key: 'face', parts: ['skin', 'eyes', 'eyebrows', 'mouth', 'nose'] },
  { key: 'hair', parts: ['hair', 'hairColour', 'facialHair'] },
  { key: 'extras', parts: ['glasses', 'earrings', 'extrasColour'] },
] as const satisfies readonly { key: string; parts: readonly AvatarPart[] }[];

/**
 * The parts shown at the bottom of the editor whichever tab is open (Robert, 7 Nov 2026: "at
 * the bottom of everything, regardless if you're in face or hairstyle or accessories").
 */
export const avatarPartsUnderTabs = ['background'] as const satisfies readonly AvatarColourPart[];

/**
 * Parts the recipe still holds but the editor no longer offers: every avatar is drawn close up,
 * so the top barely shows (Robert, 7 Nov 2026: "we only check the face, there shouldn't be any
 * clothes"). They stay in the recipe because the database checks its shape
 * (avatar_recipe_valid()) and saved avatars keep drawing the same.
 */
export const avatarPartsNotOffered = [
  'shirt',
  'shirtColour',
] as const satisfies readonly AvatarPart[];

/** One tab's key. */
export type AvatarTabKey = (typeof avatarTabs)[number]['key'];

/** Skin tones from the lightest to the deepest. */
const skinTones = [
  'ffdbb4',
  'edb98a',
  'e0a370',
  'd08b5b',
  'b8743f',
  'ae5d29',
  '8a4b2a',
  '694d3d',
  '4b3328',
];

/** Hair colours, natural ones first; every hairstyle takes any of them. */
const hairColours = [
  '2c1b18',
  '4a312c',
  '724133',
  'a55728',
  'b58143',
  'd6b370',
  'ecdcbf',
  'e8e1e1',
  'c93305',
  'f59797',
  '5b7fd6',
  '8e5bb8',
];

/** Colours for glasses and earrings. */
const extrasColours = ['2c1b18', '815e18', 'e6c24c', 'c0c0c0', '8e5bb8', '5b7fd6', 'e78276'];

/** Shirt colours. */
const shirtColours = [
  'e78276',
  'ffcf77',
  'fdea6b',
  '78e185',
  '9ddadb',
  '8fa7df',
  'e279c7',
  '481c5f',
  '3b3b3b',
  'f4f0ec',
];

/** Backgrounds: the pastel tints of the design tokens (plum, sage, gold, sky, blush, neutral). */
const backgrounds = ['f1eaf4', 'e8f1ec', 'fbf3da', 'e6eef6', 'f6e9eb', 'f4f0ec'];

/** Every part's choices: the Micah art draws all of these. */
export const avatarChoices: Record<AvatarPart, readonly string[]> = {
  // Shapes.
  hair: ['dannyPhantom', 'fonze', 'full', 'pixie', 'mrT', 'dougFunny', 'mrClean', 'turban'],
  eyebrows: ['up', 'down', 'eyelashesUp', 'eyelashesDown'],
  eyes: ['eyes', 'round', 'smiling', 'eyesShadow', 'smilingShadow'],
  mouth: ['smile', 'laughing', 'smirk', 'surprised', 'nervous', 'pucker', 'sad', 'frown'],
  nose: ['curve', 'pointed', 'tound'],
  facialHair: ['none', 'scruff', 'beard'],
  glasses: ['none', 'round', 'square'],
  earrings: ['none', 'stud', 'hoop'],
  shirt: ['crew', 'collared', 'open'],
  // Colours.
  skin: skinTones,
  hairColour: hairColours,
  extrasColour: extrasColours,
  shirtColour: shirtColours,
  background: backgrounds,
};

/**
 * Where the builder starts for someone without an avatar: a middle skin tone, swept hair, a
 * smile and no facial hair, glasses or earrings, so nothing assumes a gender.
 */
export const startingRecipe: AvatarRecipe = {
  style: 'micah',
  version: 1,
  skin: 'd08b5b',
  hair: 'dannyPhantom',
  hairColour: '4a312c',
  eyebrows: 'up',
  eyes: 'eyes',
  mouth: 'smile',
  nose: 'curve',
  facialHair: 'none',
  glasses: 'none',
  earrings: 'none',
  extrasColour: '2c1b18',
  shirt: 'crew',
  shirtColour: '8fa7df',
  background: 'f1eaf4',
};
