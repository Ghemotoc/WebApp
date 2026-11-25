/**
 * CharacterFace: a character's round face in a list: their drawn picture once it has passed the
 * check, otherwise a circle with their initials (user stories bundle 6, story 6.3: "each with a
 * circle of initials until a drawn picture passes the check"; boards E21 and E22). It replaces
 * the G10a rule that a character with no picture shows no circle.
 *
 * The circle's colour comes from the character's ID, so it stays the same everywhere. The name is
 * always written beside it, so the face is hidden from screen readers.
 * The large size (64 px) heads a character's sheet (story 6.4, board E23).
 * Who uses it: CastAtAGlance, CastList and CharacterSheetHeader. What it calls: initialsOf, beadStyleFor and lib/characterPicture.ts.
 */
import { beadStyleFor } from '@/features/avatars/lib/beadColours';
import { initialsOf } from '@/features/people/lib/formatting';

import type { StoryCharacter } from '../api/characters';
import { visiblePictureUrl } from '../lib/characterPicture';

/**
 * Renders the face: 36 px in a list, 64 px at the top of a sheet.
 *
 * @param props.id - the character's ID, which picks the circle's colour
 * @param props.name - the character's name, for the initials
 * @param props.character - the full character when known, for the picture; null shows initials
 * @param props.size - small (36 px, the default) or large (64 px)
 * @param props.alt - the picture's description where the face stands for the picture itself (the
 *   sheet's header, story 6.4: "with alt text to describe it"); left out in a list, where the name
 *   beside it says who it is
 * @returns the picture or the initials circle, hidden from screen readers
 */
export function CharacterFace({
  id,
  name,
  character,
  size = 'small',
  alt = '',
}: {
  id: string;
  name: string;
  character: Pick<StoryCharacter, 'picture' | 'pictureAlt'> | null;
  size?: 'small' | 'large';
  alt?: string;
}) {
  const pictureUrl = character === null ? null : visiblePictureUrl(character);
  // Step 1: the box's size, and the initials' type to match it.
  const sizeClass = size === 'large' ? 'size-16' : 'size-9';
  const initialsType = size === 'large' ? 'type-subheading' : 'type-meta';
  // Step 2: a picture that passed the check wins over the initials.
  if (pictureUrl !== null) {
    return (
      <img
        src={pictureUrl}
        alt={alt}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={beadStyleFor(id)}
      className={`avatar-bead inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full font-body ${initialsType} font-semibold`}
    >
      <span className="avatar-bead-initials">{initialsOf(name)}</span>
    </span>
  );
}
