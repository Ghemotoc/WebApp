/**
 * CastCards: a story's characters as a grid of glass cards (story S1-E17-08; bundle G10a, board
 * AtlasCharacters), shown when no sheet is open.
 *
 * Each card holds the name (a link to the sheet, stretched over the card), the role pill and the
 * character in a line, in role order (Protagonist first, Mentioned only last). Five across on a
 * wide screen, down to one on a phone. No picture or initials: the name stands alone (handoff).
 * Who uses it: CharactersPage. What it calls: lib/castGroups.ts and InfoPill.
 */
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';

import type { StoryCharacter } from '../api/characters';
import { groupCast } from '../lib/castGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** One character's card. */
function CastCard({ slug, character }: { slug: string; character: StoryCharacter }) {
  const { t } = useAtlasTranslation();
  const summary = character.sheet.summary ?? '';
  return (
    <li className="relative flex min-w-0 flex-col items-center gap-2.5 rounded-card border border-border bg-surface p-[22px] text-center shadow-card hover:bg-tint">
      <h3 className="m-0 font-heading text-lg leading-[1.2] font-bold break-words text-heading">
        {/* The link covers the whole card (after:inset-0), so anywhere on it opens the sheet. */}
        <Link
          to={`/plan/s/${slug}/characters/${character.id}`}
          className="text-heading no-underline after:absolute after:inset-0 after:rounded-card hover:underline"
        >
          {character.name}
        </Link>
      </h3>
      <InfoPill tone="plum">{t(`characters.role.${character.role}`)}</InfoPill>
      {summary !== '' && <p className="m-0 text-sm break-words text-meta">{summary}</p>}
    </li>
  );
}

/**
 * Renders the grid, or a plain line when nothing matches.
 *
 * @param props.slug - the story's address
 * @param props.characters - the cast
 * @param props.filter - what the writer typed in the filter box
 * @returns the cards
 */
export function CastCards({
  slug,
  characters,
  filter,
}: {
  slug: string;
  characters: StoryCharacter[];
  filter: string;
}) {
  const { t } = useAtlasTranslation();
  // Role order, then name order inside each role, as the sheet's side list shows them.
  const ordered = groupCast(characters, filter).flatMap((group) => group.characters);
  if (characters.length === 0) return <p className="m-0 text-body">{t('characters.none')}</p>;
  if (ordered.length === 0) {
    return <p className="m-0 text-body">{t('characters.noMatch', { filter: filter.trim() })}</p>;
  }
  return (
    <ul
      aria-labelledby="atlas-cast-heading"
      className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
    >
      {ordered.map((character) => (
        <CastCard key={character.id} slug={slug} character={character} />
      ))}
    </ul>
  );
}
