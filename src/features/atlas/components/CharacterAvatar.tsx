/**
 * CharacterAvatar: a character's picture, or nothing while they have none (story S1-E17-11:
 * "images are blank by default"; only the writer's own uploads appear). Bundle G10a: characters
 * never get an initials circle; with no picture the name, always written beside, stands alone
 * (handoff "Story Atlas": "no picture, name only").
 *
 * The small size is a round face crop (the cast cards of a public plan, the map); the large size
 * is the 4:5 portrait the boards draw on the right of a sheet.
 * Who uses it: CharacterPictureSection, PublicCast, PublicCharacter and RelationshipMap.
 * What it calls: lib/characterPicture.ts.
 */
import { cn } from '@/lib/utils';

import type { StoryCharacter } from '../api/characters';
import { visiblePictureUrl } from '../lib/characterPicture';

/**
 * Renders the picture, or nothing.
 *
 * @param props.character - the character
 * @param props.size - 'small' (a 40 px circle) or 'large' (the 4:5 portrait)
 * @returns the picture, or null when there is none to show
 */
export function CharacterAvatar({
  character,
  size,
}: {
  character: Pick<StoryCharacter, 'picture' | 'pictureAlt'>;
  size: 'small' | 'large';
}) {
  const url = visiblePictureUrl(character);
  if (url === null) return null;
  return (
    <img
      src={url}
      // The small one sits beside the written name, so it is decorative there.
      alt={size === 'large' ? character.pictureAlt : ''}
      className={cn(
        'shrink-0 object-cover',
        size === 'small' ? 'size-10 rounded-full' : 'aspect-[4/5] w-full max-w-[190px] rounded-3xl',
      )}
    />
  );
}
