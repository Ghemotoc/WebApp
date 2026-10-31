/**
 * CastAtAGlance: the characters on the at-a-glance page (story S1-E17-06: "the cast count and the
 * recently edited chapters and entries show, each linking to its item").
 *
 * How many characters there are, the three edited most recently (each opening its sheet) and
 * "Open characters". Who uses it: AtAGlance.
 */
import { Link } from 'react-router';

import type { StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the card.
 *
 * @returns the heading, the count, the recent characters and the link to all of them
 */
export function CastAtAGlance({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  const castAddress = `/plan/s/${page.story.slug}/characters`;
  return (
    <section
      aria-labelledby="atlas-cast-glance-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2
        id="atlas-cast-glance-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('characters.glance.heading')}
      </h2>
      <p className="m-0 text-body">
        {page.cast.count === 0
          ? t('characters.glance.none')
          : t('characters.count', { count: page.cast.count })}
      </p>
      {page.cast.recent.length > 0 && (
        <>
          <h3 id="atlas-cast-glance-recent" className="m-0 text-sm font-semibold text-meta">
            {t('characters.glance.recent')}
          </h3>
          <ul
            aria-labelledby="atlas-cast-glance-recent"
            className="m-0 flex list-none flex-col p-0"
          >
            {page.cast.recent.map((character) => (
              <li key={character.id}>
                <Link
                  to={`${castAddress}/${character.id}`}
                  className="inline-flex min-h-11 items-center break-words text-link underline"
                >
                  {character.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link
        to={castAddress}
        className="inline-flex h-11 items-center self-start rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
      >
        {t('characters.glance.open')}
      </Link>
    </section>
  );
}
