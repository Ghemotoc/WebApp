/**
 * CharacterFace: a character's round face in a list: their drawn picture once it has passed the
 * check, otherwise a circle with their initials (user stories bundle 6, story 6.3: "each with a
 * circle of initials until a drawn picture passes the check"; boards E21 and E22). It replaces
 * the G10a rule that a character with no picture shows no circle.
 *
 * The circle's colour comes from the character's ID, so it stays the same everywhere. The name is
 * always written beside it, so the face is hidden from screen readers.
 * Who uses it: CastAtAGlance and CastList. What it calls: initialsOf, beadStyleFor and lib/characterPicture.ts.
 */
import { beadStyleFor } from '@/features/avatars/lib/beadColours';
import { initialsOf } from '@/features/people/lib/formatting';

import type { StoryCharacter } from '../api/characters';
import { visiblePictureUrl } from '../lib/characterPicture';

/**
 * Renders the 36 px face.
 *
 * @param props.id - the character's ID, which picks the circle's colour
 * @param props.name - the character's name, for the initials
 * @param props.character - the full character when known, for the picture; null shows initials
 * @returns the picture or the initials circle, hidden from screen readers
 */
export function CharacterFace({
  id,
  name,
  character,
}: {
  id: string;
  name: string;
  character: Pick<StoryCharacter, 'picture' | 'pictureAlt'> | null;
}) {
  const pictureUrl = character === null ? null : visiblePictureUrl(character);
  if (pictureUrl !== null) {
    return <img src={pictureUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      style={beadStyleFor(id)}
      className="avatar-bead inline-flex size-9 shrink-0 items-center justify-center rounded-full font-body type-meta font-semibold"
    >
      <span className="avatar-bead-initials">{initialsOf(name)}</span>
    </span>
  );
}
