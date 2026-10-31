/**
 * CastList: the left side of the Characters page (story S1-E17-08: "they are grouped by role
 * (Protagonist, Deuteragonist, Antagonist, Supporting, Minor, Mentioned only) and I can filter
 * them by typing").
 *
 * "New character" (the caller makes it and opens its sheet), a filter box that matches names and
 * "also known as" without minding accents, then one list per role. Each name is a link to the
 * sheet; the open one carries aria-current, and a filled background, not colour alone.
 * Who uses it: CharactersPage. What it calls: lib/castGroups.ts.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { cn } from '@/lib/utils';

import type { StoryCharacter } from '../api/characters';
import { groupCast } from '../lib/castGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterAvatar } from './CharacterAvatar';

/** What the list needs. */
export interface CastListProps {
  slug: string;
  characters: StoryCharacter[];
  /** The character whose sheet is open, if any. */
  openCharacterId: string | undefined;
  /** Makes a character and opens its sheet; throws when it can't. */
  onCreate: () => Promise<void>;
}

/** One name in the list: the avatar and the name, linking to the sheet. */
function CastLink({
  slug,
  character,
  isOpen,
}: {
  slug: string;
  character: StoryCharacter;
  isOpen: boolean;
}) {
  return (
    <Link
      to={`/plan/s/${slug}/characters/${character.id}`}
      aria-current={isOpen ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 text-heading no-underline hover:bg-tint',
        isOpen && 'bg-tint font-semibold',
      )}
    >
      <CharacterAvatar character={character} size="small" />
      <span className="min-w-0 break-words">{character.name}</span>
    </Link>
  );
}

/** "New character", with a plain message when it couldn't be made. */
function NewCharacterButton({ onCreate }: { onCreate: () => Promise<void> }) {
  const { t } = useAtlasTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [failed, setFailed] = useState(false);

  /** Makes the character; a failure says so and lets the writer try again. */
  async function create() {
    setIsCreating(true);
    setFailed(false);
    await onCreate().catch(() => setFailed(true));
    setIsCreating(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button className="self-start" disabled={isCreating} onClick={() => void create()}>
        {t('characters.newCharacter')}
      </Button>
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('characters.createFailed')}</Notice>}
      </div>
    </div>
  );
}

/**
 * Renders the list.
 *
 * @returns "New character", the filter and the groups
 */
export function CastList({ slug, characters, openCharacterId, onCreate }: CastListProps) {
  const { t } = useAtlasTranslation();
  const [filter, setFilter] = useState('');
  const groups = groupCast(characters, filter);
  return (
    <section aria-labelledby="atlas-cast-heading" className="flex min-w-0 flex-col gap-4">
      <h2 id="atlas-cast-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('characters.count', { count: characters.length })}
      </h2>
      <NewCharacterButton onCreate={onCreate} />
      {characters.length > 0 && (
        <TextInput
          id="atlas-cast-filter"
          type="search"
          label={t('characters.filter')}
          hint={t('characters.filterHint')}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      )}
      {characters.length === 0 && <p className="m-0 text-body">{t('characters.none')}</p>}
      {characters.length > 0 && groups.length === 0 && (
        <p className="m-0 text-body">{t('characters.noMatch', { filter: filter.trim() })}</p>
      )}
      {groups.map((group) => (
        <div key={group.role} className="flex flex-col gap-1">
          <h3 id={`atlas-cast-${group.role}`} className="m-0 text-sm font-semibold text-meta">
            {t(`characters.role.${group.role}`)} ({group.characters.length})
          </h3>
          <ul
            aria-labelledby={`atlas-cast-${group.role}`}
            className="m-0 flex list-none flex-col p-0"
          >
            {group.characters.map((character) => (
              <li key={character.id}>
                <CastLink
                  slug={slug}
                  character={character}
                  isOpen={character.id === openCharacterId}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
