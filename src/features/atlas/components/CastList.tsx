/**
 * CastList: a story's characters on the Characters page, with the filter above them (user stories
 * bundle 6, stories 6.3 and 6.4; boards E22 and E23).
 *
 * "Filter characters" with its hint (not beside an open sheet, board E23), how many characters
 * there are, then one hairline row per character in role order (Protagonist, Deuteragonist, Antagonist, Supporting, Minor, Mentioned
 * only): a circle of initials until a drawn picture passes the check, the name (a link to the
 * sheet) and a meta line with the role in bold and the character in a line. The filter narrows the
 * rows as the writer types, by name or "also known as", without minding accents; nothing found
 * says "No one matches “…”". The open character's row carries aria-current and sits on the tint,
 * so it isn't told by colour alone.
 * Who uses it: CharactersPage. What it calls: lib/castGroups.ts, TextInput, MetaLine and
 * CharacterFace.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { TextInput } from '@/components/ui/TextInput';
import { cn } from '@/lib/utils';

import type { StoryCharacter } from '../api/characters';
import { groupCast } from '../lib/castGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterFace } from './CharacterFace';

/** What the list needs. */
export interface CastListProps {
  slug: string;
  characters: StoryCharacter[];
  /** What the writer typed in the filter box. */
  filter: string;
  onFilterChange: (filter: string) => void;
  /** The character whose sheet is open, if any. */
  openCharacterId: string | undefined;
  /** False beside an open sheet, where board E23 draws the list without the filter. */
  showsFilter: boolean;
}

/** One character's row: the face, the name as a link and the meta line. */
function CastRow({
  slug,
  character,
  isOpen,
}: {
  slug: string;
  character: StoryCharacter;
  isOpen: boolean;
}) {
  const { t } = useAtlasTranslation();
  return (
    <li
      className={cn(
        'flex items-start gap-4 border-t border-hairline px-2 py-3 first:border-t-0',
        isOpen && 'rounded-field bg-tint',
      )}
    >
      <CharacterFace id={character.id} name={character.name} character={character} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/plan/s/${slug}/characters/${character.id}`}
          aria-current={isOpen ? 'page' : undefined}
          className="type-body font-semibold wrap-anywhere text-ink-heading no-underline hover:underline"
        >
          {character.name}
        </Link>
        <MetaLine
          facts={[
            { text: t(`characters.role.${character.role}`), kind: 'state' },
            { text: character.sheet.summary ?? '' },
          ]}
        />
      </div>
    </li>
  );
}

/**
 * Renders the filter and the rows.
 *
 * @returns the filter, the count and the rows, or the line for no characters or no match
 */
export function CastList({
  slug,
  characters,
  filter,
  onFilterChange,
  openCharacterId,
  showsFilter,
}: CastListProps) {
  const { t } = useAtlasTranslation();
  // Step 1: a story with no characters yet says how to add the first.
  if (characters.length === 0) {
    return <p className="m-0 type-body text-ink-muted">{t('characters.none')}</p>;
  }
  // Step 2: role order, then name order inside each role (lib/castGroups.ts), narrowed by the
  // filter.
  const shown = groupCast(characters, filter).flatMap((group) => group.characters);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {showsFilter && (
        <TextInput
          id="atlas-cast-filter"
          type="search"
          label={t('characters.filter')}
          hint={t('characters.filterHint')}
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
        />
      )}
      <p className="m-0 type-meta">{t('characters.count', { count: characters.length })}</p>
      {shown.length === 0 ? (
        <p className="m-0 type-body text-ink-muted">
          {t('characters.noMatch', { filter: filter.trim() })}
        </p>
      ) : (
        <ul aria-label={t('characters.heading')} className="m-0 list-none p-0">
          {shown.map((character) => (
            <CastRow
              key={character.id}
              slug={slug}
              character={character}
              isOpen={character.id === openCharacterId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
