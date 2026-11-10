/**
 * characterPicture: whether a character has a picture that may show (story S1-E17-11).
 *
 * A picture shows only once its check passed and the database gave a signed address; anything
 * else (no picture, being checked, removed) shows nothing, and the name stands alone: characters
 * never get an initials circle (bundle G10a; handoff "Story Atlas": "no picture, name only").
 * Who uses it: CharacterAvatar and RelationshipMap. What it calls: nothing.
 */
import type { StoryCharacter } from '../api/characters';

/** The parts of a character the check needs (the public plan's characters have the same). */
type WithPicture = Pick<StoryCharacter, 'picture'>;

/**
 * Says whether the character's picture can show.
 *
 * @param character - the character
 * @returns the signed address when the picture passed its check, otherwise null
 */
export function visiblePictureUrl(character: WithPicture): string | null {
  const picture = character.picture;
  if (picture?.state === 'visible' && picture.url !== null) return picture.url;
  return null;
}
