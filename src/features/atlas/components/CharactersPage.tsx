/**
 * CharactersPage: /plan/s/:storySlug/characters and …/characters/:characterId, a story's cast in
 * Story Atlas (stories S1-E17-08 to S1-E17-11 and S1-E17-13; user stories bundle 6, stories 6.3
 * and 6.4, boards E22 and E23).
 *
 * The Story Atlas top bar, then "Characters" with "New character" under it (the page's one main
 * button; its words fold to the icon after 3 visits, story 6.3) and the private note. Then the
 * list (CastList) on the left and, on the right, the open character's sheet or "Choose a character
 * to open their sheet.". On a phone the list stands alone, and an open sheet is its own page with
 * "Characters" to go back; from 1024 px the list stays beside an open sheet (story 6.4), from
 * 768 px beside the empty place (story 6.3). "New character" adds "New character" at the end and
 * opens its sheet. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryCast → story_cast() and the character functions; useMyStories for the top bar.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { NavIcon } from '@/components/icons/NavIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';

import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryCast } from '../api/characters';
import { useStoryCast } from '../hooks/useStoryCast';
import { countAtlasVisit, showsAddHints } from '../lib/addHintVisits';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasFrame } from './AtlasFrame';
import { CastList } from './CastList';
import { CharacterSheet } from './CharacterSheet';
import { NewCharacterButton } from './NewCharacterButton';

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
  if (character === undefined)
    return <p className="m-0 text-ink-muted">{t('characters.notFound')}</p>;

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

/** The right-hand place before a character is chosen: a quiet icon and a plain line. */
function ChooseCharacter() {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-tint text-ink-heading">
        <ActionIcon name="people" size={20} />
      </span>
      <p className="m-0 type-body text-ink-muted">{t('characters.choose')}</p>
    </div>
  );
}

/** "Characters", the way back to the list above an open sheet on phones and tablets. */
function BackToCast({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  return (
    <Link
      to={`/plan/s/${slug}/characters`}
      className={`${buttonClassName({ variant: 'text' })} self-start lg:hidden`}
    >
      <NavIcon name="back" size={16} />
      {t('characters.backToCast')}
    </Link>
  );
}

/**
 * The cast: the list on the left and the sheet (or "Choose a character…") on the right. Under
 * 768 px with no character open the list stands alone; under 1024 px an open sheet stands alone
 * with "Characters" to go back (stories 6.3 and 6.4). Beside an open sheet the list is a narrow
 * 260 px column without the filter, as board E23 draws it.
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
  const [filter, setFilter] = useState('');
  const isOpen = characterId !== undefined;
  return (
    <div
      className={
        isOpen
          ? 'grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]'
          : 'grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'
      }
    >
      <div className={isOpen ? 'hidden min-w-0 lg:block' : 'min-w-0'}>
        <CastList
          slug={slug}
          characters={cast.characters}
          filter={filter}
          onFilterChange={setFilter}
          openCharacterId={characterId}
          showsFilter={!isOpen}
        />
      </div>
      {isOpen ? (
        <div className="flex min-w-0 flex-col gap-4">
          <BackToCast slug={slug} />
          <OpenCharacter slug={slug} cast={cast} characterId={characterId} />
        </div>
      ) : (
        cast.characters.length > 0 && (
          <div className="hidden min-w-0 md:block">
            <ChooseCharacter />
          </div>
        )
      )}
    </div>
  );
}

/**
 * "New character" under the page's title: the main button, which makes a character named "New
 * character" and opens its sheet. Its words show for the first 3 visits, then fold to the icon
 * (story 6.3; lib/addHintVisits.ts).
 */
function CastNewCharacter({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const changers = useStoryCast(slug);
  const [visits] = useState(countAtlasVisit);

  /** Makes one with the default name and opens its sheet. */
  async function create() {
    const newId = await changers.create(t('characters.newName'));
    await navigate(`/plan/s/${slug}/characters/${newId}`);
  }

  return (
    <NewCharacterButton onCreate={create} isMain isCompact={!showsAddHints(visits)} icon="plus" />
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
    <AtlasFrame
      slug={storySlug}
      writeAddress={writeAddressFor(story)}
      section="characters"
      showsChrome={userId !== null}
    >
      <title>
        {cast ? t('characters.documentTitle', { title: cast.storyTitle }) : t('homeDocumentTitle')}
      </title>
      {userId === null && <p className="m-0 text-ink-muted">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {cast === null && <Notice tone="error">{t('notFound')}</Notice>}
      {cast !== undefined && cast !== null && (
        <>
          <AtlasPageHeading
            title={t('characters.heading')}
            action={<CastNewCharacter slug={storySlug} />}
          />
          <CastBody slug={storySlug} cast={cast} characterId={characterId} />
        </>
      )}
    </AtlasFrame>
  );
}
