/**
 * ReaderCharactersList: every character with what readers see of it, on "What readers can see"
 * (story S1-E17-32; bundle G10 ATLAS, part c4, board AtlasReaders: the "Characters" list).
 *
 * One glass list, a row per character in the cast's name order. A story with no characters says
 * so. Who uses it: ReaderViewPage. What it calls: useStoryCast and ReaderCharacterRow.
 */
import type { PlanVisibility } from '../api/readerView';
import { useStoryCast } from '../hooks/useStoryCast';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { ReaderCharacterRow } from './ReaderCharacterRow';

/**
 * Renders the list.
 *
 * @param props.slug - the story's address
 * @param props.visibility - the story's switches
 * @returns the section, or nothing while the cast loads
 */
export function ReaderCharactersList({
  slug,
  visibility,
}: {
  slug: string;
  visibility: PlanVisibility;
}) {
  const { t } = useAtlasTranslation();
  const { cast } = useStoryCast(slug);
  if (!cast) return null;
  return (
    <section aria-labelledby="atlas-reader-characters" className="flex min-w-0 flex-col gap-3">
      <h2
        id="atlas-reader-characters"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('readers.characters.heading')}
      </h2>
      {cast.characters.length === 0 && (
        <p className="m-0 text-body">{t('readers.characters.none')}</p>
      )}
      {cast.characters.length > 0 && (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card">
          {cast.characters.map((character) => (
            <ReaderCharacterRow
              key={character.id}
              slug={slug}
              character={character}
              fields={cast.fields}
              visibility={visibility}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
