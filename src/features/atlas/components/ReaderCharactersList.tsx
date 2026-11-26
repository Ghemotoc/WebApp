/**
 * ReaderCharactersList: "Characters" on "What readers can see", every character with what readers
 * see of it (story S1-E17-32; redrawn by user stories bundle 6, story 6.14, board E33: "each
 * character, relationship and entry shows from a chapter the writer picks … Characters also
 * choose the parts of the sheet").
 *
 * A section between hairlines, as board E33 draws it: the heading, a line on the chapter guard,
 * then a hairline row per character in role order (Protagonist first, as the cast list), the
 * first five at first and "Show N more" for the rest. A story with no characters says so.
 * Who uses it: ReaderViewPage. What it calls: useStoryCast, lib/castGroups.ts, AtlasSection and
 * ReaderCharacterRow.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

import type { PlanVisibility } from '../api/readerView';
import { useStoryCast } from '../hooks/useStoryCast';
import { groupCast } from '../lib/castGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasSection } from './AtlasSection';
import { ReaderCharacterRow } from './ReaderCharacterRow';

/** How many rows show before "Show N more" (board E33 draws five). */
const firstRows = 5;

/**
 * Renders the section.
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
  const [isAllShown, setIsAllShown] = useState(false);
  if (!cast) return null;
  // Step 1: role order, then name order inside each role, as the cast list shows them.
  const ordered = groupCast(cast.characters, '').flatMap((group) => group.characters);
  // Step 2: the first five, or every one once "Show N more" is pressed.
  const shown = isAllShown ? ordered : ordered.slice(0, firstRows);
  const hiddenCount = ordered.length - shown.length;
  return (
    <AtlasSection id="atlas-reader-characters" heading={t('readers.characters.heading')}>
      <p className="m-0 -mt-2 max-w-none type-meta text-ink-muted">
        {t('readers.characters.hint')}
      </p>
      {ordered.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('readers.characters.none')}</p>
      )}
      {ordered.length > 0 && (
        <ul aria-label={t('readers.characters.listLabel')} className="m-0 list-none p-0">
          {shown.map((character) => (
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
      {hiddenCount > 0 && (
        <Button
          variant="text"
          className="self-start"
          onClick={() => {
            // The button goes away, so the focus moves to the first character it brought in.
            const nextId = ordered[firstRows]?.id;
            setIsAllShown(true);
            requestAnimationFrame(() =>
              document.getElementById(`atlas-reader-name-${nextId}`)?.focus(),
            );
          }}
        >
          {t('readers.characters.showMore', { count: hiddenCount })}
        </Button>
      )}
    </AtlasSection>
  );
}
