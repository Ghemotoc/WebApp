/**
 * CharactersPage: /plan/s/:storySlug/characters and …/characters/:characterId, a story's cast in
 * Story Atlas (stories S1-E17-08 to S1-E17-11 and S1-E17-13).
 *
 * The Story Atlas top bar, then the cast list and the open character's sheet: beside the list on
 * a laptop, below it on a phone (S1-E17-08). "New character" makes one and opens its sheet.
 * Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryCast → story_cast() and the character functions; useMyStories for the top bar.
 */
import { useNavigate, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryCast } from '../api/characters';
import { useStoryCast } from '../hooks/useStoryCast';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasTopBar } from './AtlasTopBar';
import { CastList } from './CastList';
import { CharacterSheet } from './CharacterSheet';

/** The list and the sheet, side by side on a laptop. */
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
  const character = cast.characters.find((candidate) => candidate.id === characterId);
  const castAddress = `/plan/s/${slug}/characters`;

  /** "New character": makes one with the default name and opens its sheet. */
  async function create() {
    const newId = await changers.create(t('characters.newName'));
    await navigate(`${castAddress}/${newId}`);
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
      <CastList
        slug={slug}
        characters={cast.characters}
        openCharacterId={characterId}
        onCreate={create}
      />
      {character === undefined && (
        <p className="m-0 text-body">
          {characterId === undefined ? t('characters.pick') : t('characters.notFound')}
        </p>
      )}
      {character !== undefined && (
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
            await navigate(castAddress);
          }}
        />
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
          <header className="flex flex-col gap-2">
            <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
              {t('characters.heading')}
            </h1>
            <p className="m-0 text-sm text-meta">
              {cast.storyTitle} · {t('privateNote')}
            </p>
          </header>
          <CastBody slug={storySlug} cast={cast} characterId={characterId} />
        </>
      )}
    </PageContainer>
  );
}
