/**
 * The choices the avatar builder offers, part by part (bundle ADMIN-2, part g; Robert's brief of
 * 2 Nov 2026, section 7: "Offer a full range of skin tones, no gendered default and no free
 * text").
 *
 * The parts are the Open Peeps art's own names (@dicebear/open-peeps, CC0; ADR 0013). A few of its
 * expressions are left out because they look angry, scared or monstrous, and the bear hat because
 * it hides the face. Each choice's name on screen is `avatars.<part>.<value>` in the locale files.
 * Colours are six hex digits; the database checks the same shape (avatar_recipe_valid()).
 * Who uses it: AvatarBuilderSection (the drop-downs), randomRecipe (Surprise me), drawAvatar.
 */
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

/** The recipe's parts the builder lets a person choose, in the order of the drop-downs. */
export const avatarParts = [
  'skin',
  'head',
  'hairColour',
  'expression',
  'facialHair',
  'accessory',
  'clothes',
  'background',
] as const;

/** One part's name. */
export type AvatarPart = (typeof avatarParts)[number];

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

/** Hair and head-covering shapes (everything Open Peeps draws except the bear hat). */
const heads = [
  'afro',
  'bangs',
  'bangs2',
  'bantuKnots',
  'bun',
  'bun2',
  'buns',
  'cornrows',
  'cornrows2',
  'dreads1',
  'dreads2',
  'flatTop',
  'flatTopLong',
  'grayBun',
  'grayMedium',
  'grayShort',
  'hatBeanie',
  'hatHip',
  'hijab',
  'long',
  'longAfro',
  'longBangs',
  'longCurly',
  'medium1',
  'medium2',
  'medium3',
  'mediumBangs',
  'mediumBangs2',
  'mediumBangs3',
  'mediumStraight',
  'mohawk',
  'mohawk2',
  'noHair1',
  'noHair2',
  'noHair3',
  'pomp',
  'shaved1',
  'shaved2',
  'shaved3',
  'short1',
  'short2',
  'short3',
  'short4',
  'short5',
  'turban',
  'twists',
  'twists2',
];

/** Hair colours, natural ones first. */
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

/** Friendly expressions (eyes and mouth together, as the art draws them). */
const expressions = [
  'smile',
  'smileBig',
  'smileLOL',
  'smileTeethGap',
  'lovingGrin1',
  'lovingGrin2',
  'cute',
  'cheeky',
  'calm',
  'blank',
  'serious',
  'solemn',
  'driven',
  'explaining',
  'eatingHappy',
  'awe',
  'concerned',
  'suspicious',
  'eyesClosed',
  'tired',
  'old',
];

/** Facial hair; "none" first. */
const facialHair = [
  'none',
  'chin',
  'full',
  'full2',
  'full3',
  'full4',
  'goatee1',
  'goatee2',
  'moustache1',
  'moustache2',
  'moustache3',
  'moustache4',
  'moustache5',
  'moustache6',
  'moustache7',
  'moustache8',
  'moustache9',
];

/** Glasses and the like; "none" first. */
const accessories = [
  'none',
  'glasses',
  'glasses2',
  'glasses3',
  'glasses4',
  'glasses5',
  'sunglasses',
  'sunglasses2',
  'eyepatch',
];

/** Clothes colours. */
const clothesColours = [
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

/** Every part's choices. */
export const avatarChoices: Record<AvatarPart, readonly string[]> = {
  skin: skinTones,
  head: heads,
  hairColour: hairColours,
  expression: expressions,
  facialHair,
  accessory: accessories,
  clothes: clothesColours,
  background: backgrounds,
};

/**
 * Where the builder starts for someone without an avatar: a middle skin tone, medium hair, a
 * smile, no facial hair and no accessory, so nothing assumes a gender.
 */
export const startingRecipe: AvatarRecipe = {
  style: 'open-peeps',
  version: 1,
  skin: 'd08b5b',
  head: 'medium1',
  hairColour: '4a312c',
  expression: 'smile',
  facialHair: 'none',
  accessory: 'none',
  clothes: '8fa7df',
  background: 'f1eaf4',
};
