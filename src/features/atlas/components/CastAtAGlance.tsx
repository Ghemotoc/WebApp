/**
 * CastAtAGlance: the characters on the at-a-glance page (story S1-E17-06: "the cast count and the
 * recently edited chapters and entries show, each linking to its item"; bundle G10a, board
 * AtlasStory: "Characters · edited recently").
 *
 * A glass list of the five characters edited last, each with its role and its line, opening its
 * sheet; then "Open characters" as a grey glass pill. With no characters yet it says so.
 * Who uses it: AtAGlance. What it calls: GlassList and GlassListRow.
 */
import { Link } from 'react-router';

import type { StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { GlassList } from './GlassList';
import { GlassListRow } from './GlassListRow';

/**
 * Renders the list and the link to every character.
 *
 * @returns the recent characters (or a plain note) and "Open characters"
 */
export function CastAtAGlance({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  const castAddress = `/plan/s/${page.story.slug}/characters`;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {page.cast.recent.length === 0 ? (
        <p className="m-0 px-[18px] text-body">{t('characters.glance.none')}</p>
      ) : (
        <GlassList id="atlas-cast-glance" label={t('characters.glance.recentList')}>
          {page.cast.recent.map((character) => (
            <GlassListRow
              key={character.id}
              to={`${castAddress}/${character.id}`}
              title={character.name}
              line={[t(`characters.role.${character.role}`), character.summary]
                .filter((part) => part !== '')
                .join(' · ')}
            />
          ))}
        </GlassList>
      )}
      <Link
        to={castAddress}
        className="inline-flex h-11 items-center self-start rounded-full button-glass px-5 text-sm font-semibold no-underline"
      >
        {t('characters.glance.open', { count: page.cast.count })}
      </Link>
    </div>
  );
}
