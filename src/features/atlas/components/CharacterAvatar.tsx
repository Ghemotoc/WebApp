/**
 * CharacterAvatar: a character's picture, or their initials while they have none (story
 * S1-E17-11: "images are blank by default"; only the writer's own uploads appear).
 *
 * The picture shows only once its check passed and the database gave a signed address; anything
 * else (no picture, being checked, removed) shows the initials. The initials are decorative: the
 * name is always written beside them, so they are hidden from screen readers.
 * Who uses it: CastList and CharacterPictureSection. What it calls: lib/characterInitials.ts.
 */
import { cn } from '@/lib/utils';

import type { StoryCharacter } from '../api/characters';
import { characterInitials } from '../lib/characterInitials';

/**
 * Renders the picture or the initials.
 *
 * @param props.character - the character
 * @param props.size - 'small' in the cast list, 'large' on the sheet
 * @returns a round picture or a round tint with the initials
 */
export function CharacterAvatar({
  character,
  size,
}: {
  character: StoryCharacter;
  size: 'small' | 'large';
}) {
  const box = size === 'small' ? 'size-10 text-sm' : 'size-24 text-[28px]';
  const picture = character.picture;
  if (picture?.state === 'visible' && picture.url !== null) {
    return (
      <img
        src={picture.url}
        alt={size === 'large' ? character.pictureAlt : ''}
        className={cn('shrink-0 rounded-full object-cover', box)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-tint font-heading font-bold text-heading',
        box,
      )}
    >
      {characterInitials(character.name)}
    </span>
  );
}
