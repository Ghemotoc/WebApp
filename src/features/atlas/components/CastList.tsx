/**
 * CastList: the cast beside an open character's sheet (story S1-E17-08: "they are grouped by role
 * (Protagonist, Deuteragonist, Antagonist, Supporting, Minor, Mentioned only)"; bundle G10a, board
 * AtlasCharacterSheet: one small glass list per role).
 *
 * Each row is the name and the character in a line, linking to the sheet; the open one carries
 * aria-current and sits on the soft tint, not told by colour alone. It follows the filter typed
 * in the toolbar above.
 * Who uses it: CharactersPage. What it calls: lib/castGroups.ts, GlassList and GlassListRow.
 */
import type { StoryCharacter } from '../api/characters';
import { groupCast } from '../lib/castGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { GlassList } from './GlassList';
import { GlassListRow } from './GlassListRow';

/** What the list needs. */
export interface CastListProps {
  slug: string;
  characters: StoryCharacter[];
  /** What the writer typed in the filter box. */
  filter: string;
  /** The character whose sheet is open. */
  openCharacterId: string | undefined;
}

/**
 * Renders the groups.
 *
 * @returns one glass list per role that has someone in it, or a plain line when nothing matches
 */
export function CastList({ slug, characters, filter, openCharacterId }: CastListProps) {
  const { t } = useAtlasTranslation();
  const groups = groupCast(characters, filter);
  return (
    <nav aria-label={t('characters.heading')} className="flex min-w-0 flex-col gap-4">
      {groups.length === 0 && (
        <p className="m-0 text-body">{t('characters.noMatch', { filter: filter.trim() })}</p>
      )}
      {groups.map((group) => (
        <GlassList
          key={group.role}
          id={`atlas-cast-${group.role}`}
          headingLevel={3}
          label={`${t(`characters.role.${group.role}`)} (${String(group.characters.length)})`}
        >
          {group.characters.map((character) => (
            <GlassListRow
              key={character.id}
              to={`/plan/s/${slug}/characters/${character.id}`}
              title={character.name}
              line={character.sheet.summary ?? ''}
              isCurrent={character.id === openCharacterId}
            />
          ))}
        </GlassList>
      ))}
    </nav>
  );
}
