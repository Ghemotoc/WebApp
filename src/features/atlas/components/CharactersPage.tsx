/**
 * CharactersPage: /plan/s/:storySlug/characters and …/characters/:characterId, a story's cast in
 * Story Atlas (stories S1-E17-08 to S1-E17-11 and S1-E17-13).
 *
 * The Story Atlas top bar, then the cast: cards for every character, or, once one is open, the
 * list by role beside its sheet (below it on a phone; S1-E17-08, G10a liquid glass boards).
 * "New character" makes one and opens its sheet.
 * Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryCast → story_cast() and the character functions; useMyStories for the top bar.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryCast } from '../api/characters';
import { useStoryCast } from '../hooks/useStoryCast';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasTopBar } from './AtlasTopBar';
import { CastCards } from './CastCards';
import { CastList } from './CastList';
import { CastToolbar } from './CastToolbar';
import { CharacterSheet } from './CharacterSheet';

/** The open character's sheet, or a plain line when the address names no character. */
function OpenCharacter({
  slug,
  cast,
  characterId,
}: {
  slug: string;
  cast: StoryCast;
  characterId: string;
}) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const changers = useStoryCast(slug);
  const character = cast.characters.find((candidate) => candidate.id === characterId);

  // Step 1: an address for a character that no longer exists (deleted, or a typo).
  if (character === undefined) return <p className="m-0 text-body">{t('characters.notFound')}</p>;

  // Step 2: the sheet, saving each change as the writer makes it.
  return (
    <CharacterSheet
      key={character.id}
      slug={slug}
      cast={cast}
      character={character}
      saveChange={async (change) => changers.save(character.id, change)}
      uploadPicture={async (file) => changers.uploadPicture(character.id, file)}
      removePicture={async () => changers.removePicture(character.id)}
      onDelete={async () => {
        await changers.remove(character.id);
        await navigate(`/plan/s/${slug}/characters`);
      }}
    />
  );
}

/**
 * The cast: the toolbar (count, filter, New character), then either the cast cards (no
 * character open, board AtlasCharacters) or the list by role beside the open sheet (board
 * AtlasCharacterSheet; the list sits above the sheet on a phone).
 */
function CastBody({
  slug,
  cast,
  characterId,
}: {
  slug: string;
  cast: StoryCast;
  characterId: string | undefined;
}) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const changers = useStoryCast(slug);
  const [filter, setFilter] = useState('');

  /** "New character": makes one with the default name and opens its sheet. */
  async function create() {
    const newId = await changers.create(t('characters.newName'));
    await navigate(`/plan/s/${slug}/characters/${newId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <CastToolbar
        count={cast.characters.length}
        filter={filter}
        onFilterChange={setFilter}
        onCreate={create}
      />
      {characterId === undefined && (
        <CastCards slug={slug} characters={cast.characters} filter={filter} />
      )}
      {characterId !== undefined && (
        <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <CastList
            slug={slug}
            characters={cast.characters}
            filter={filter}
            openCharacterId={characterId}
          />
          <OpenCharacter slug={slug} cast={cast} characterId={characterId} />
        </div>
      )}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Characters page, a wait or a plain message
 */
export function CharactersPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '', characterId } = useParams();
  const { userId, isKnown } = useSession();
  const { cast, loadFailed } = useStoryCast(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);

  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>
        {cast ? t('characters.documentTitle', { title: cast.storyTitle }) : t('homeDocumentTitle')}
      </title>
      {userId !== null && (
        <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section="characters" />
      )}
      {userId === null && <p className="m-0 text-body">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {cast === null && <Notice tone="error">{t('notFound')}</Notice>}
      {cast !== undefined && cast !== null && (
        <>
          <AtlasPageHeading title={t('characters.heading')} />
          <CastBody slug={storySlug} cast={cast} characterId={characterId} />
        </>
      )}
    </PageContainer>
  );
}
