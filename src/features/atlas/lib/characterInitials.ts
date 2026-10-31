/**
 * The initials a character shows while it has no picture (story S1-E17-11: "Given a character
 * with no image, when the sheet shows, then the initials show instead").
 *
 * Who calls it: components/CharacterAvatar.tsx. What it calls: nothing.
 */

/**
 * The first letter of the first and last words of a name, in capitals.
 *
 * @param name - the character's name, such as "Ana Mureșan" or "the Night Keeper"
 * @returns one or two letters ("AM", "TK"), or "?" for a name with no letters
 */
export function characterInitials(name: string): string {
  // Step 1: the words that start with a letter (Unicode letters, so "Ștefan" gives "Ș").
  const words = name.split(/\s+/).filter((word) => /^\p{L}/u.test(word));
  const first = words.at(0);
  if (first === undefined) return '?';
  // Step 2: the first word's letter, plus the last word's when there are two or more.
  const last = words.length > 1 ? words.at(-1) : undefined;
  const letters = [first, last].map((word) => (word === undefined ? '' : Array.from(word)[0]));
  return letters.join('').toLocaleUpperCase();
}
