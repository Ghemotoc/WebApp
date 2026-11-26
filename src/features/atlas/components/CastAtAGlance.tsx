/**
 * CastAtAGlance: "Characters" on the at-a-glance page: the five characters edited last, then
 * "Open characters" (story S1-E17-06; redrawn as board E21 in user stories bundle 6).
 *
 * Flat under a fine line with "Edited recently" under the heading. Each row: the character's face
 * (picture or initials), the name as a link to the sheet, and a meta line with the role in bold
 * and the character's one-line summary.
 * Who uses it: AtAGlance. What it calls: useStoryCast (the cached cast, for the pictures),
 * AtlasFlatSection, CharacterFace and MetaLine.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine } from '@/components/ui/MetaLine';

import type { RecentCharacter, StoryPlanPage } from '../api/storyPlans';
import { useStoryCast } from '../hooks/useStoryCast';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasFlatSection } from './AtlasFlatSection';
import { CharacterFace } from './CharacterFace';

/** One character's row. */
function CastRow({
  character,
  address,
  full,
}: {
  character: RecentCharacter;
  address: string;
  full: Parameters<typeof CharacterFace>[0]['character'];
}) {
  const { t } = useAtlasTranslation();
  return (
    <li className="flex items-start gap-4 border-t border-hairline py-3">
      <CharacterFace id={character.id} name={character.name} character={full} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={address}
          className="type-body font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {character.name}
        </Link>
        <MetaLine
          facts={[
            { text: t(`characters.role.${character.role}`), kind: 'state' },
            { text: character.summary },
          ]}
        />
      </div>
    </li>
  );
}

/**
 * Renders the section.
 *
 * @param props.page - the plan, from story_plan()
 * @returns the recent characters (or a plain note) and "Open characters"
 */
export function CastAtAGlance({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  const { cast } = useStoryCast(page.story.slug);
  const castAddress = `/plan/s/${page.story.slug}/characters`;
  return (
    <AtlasFlatSection
      headingId="atlas-cast-glance-heading"
      heading={t('characters.heading')}
      note={t('glance.editedRecently')}
    >
      {page.cast.recent.length === 0 ? (
        <p className="m-0 type-body text-ink-muted">{t('characters.glance.none')}</p>
      ) : (
        <ul aria-label={t('characters.glance.recentList')} className="m-0 list-none p-0">
          {page.cast.recent.map((character) => (
            <CastRow
              key={character.id}
              character={character}
              address={`${castAddress}/${character.id}`}
              full={cast?.characters.find((candidate) => candidate.id === character.id) ?? null}
            />
          ))}
        </ul>
      )}
      <Link to={castAddress} className={`${buttonClassName({ variant: 'text' })} self-start`}>
        {t('characters.glance.open', { count: page.cast.count })}
      </Link>
    </AtlasFlatSection>
  );
}
