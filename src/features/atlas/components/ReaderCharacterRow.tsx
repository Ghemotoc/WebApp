/**
 * ReaderCharacterRow: one character on "What readers can see" (story S1-E17-32; redrawn by user
 * stories bundle 6, story 6.14, board E33).
 *
 * A hairline row, as board E33 draws it: the character's face (their picture, or a circle of
 * initials), the name as a link to the sheet, a meta line with the role in bold and what readers
 * see ("From the start · Basics, Look and voice", "From chapter 9: Corina counts too · Basics" or
 * "Kept private"), and a quiet "Change" at the end, which opens the same controls the sheet has
 * under the row: "Keep private", "Readers see it from" and the sheet's part switches.
 * Who uses it: ReaderCharactersList. What it calls: readerSummaryOf, CharacterFace, MetaLine,
 * ItemVisibilityControls and SheetPartsControls.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { MetaLine } from '@/components/ui/MetaLine';

import type { CharacterField, StoryCharacter } from '../api/characters';
import type { PlanVisibility } from '../api/readerView';
import { readerSummaryOf, type ReaderSummary } from '../lib/readerSummary';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterFace } from './CharacterFace';
import { ItemVisibilityControls } from './ItemVisibilityControls';
import { SheetPartsControls } from './SheetPartsControls';

/** What the row needs. */
export interface ReaderCharacterRowProps {
  slug: string;
  character: StoryCharacter;
  fields: CharacterField[];
  visibility: PlanVisibility;
}

/** The summary as one line of words. */
function useSummaryLine(summary: ReaderSummary): string {
  const { t } = useAtlasTranslation();
  // Step 1: "Keep private" says only that.
  if (summary.kind === 'private') return t('readers.characters.keptPrivate');
  // Step 2: where it shows from: the start, or the chapter, with its title when it has one.
  let from = t('readers.characters.fromStart');
  if (summary.chapterNumber !== null && summary.chapterTitle === '') {
    from = t('readers.characters.fromChapter', { number: summary.chapterNumber });
  }
  if (summary.chapterNumber !== null && summary.chapterTitle !== '') {
    from = t('readers.characters.fromChapterTitled', {
      number: summary.chapterNumber,
      title: summary.chapterTitle,
    });
  }
  // Step 3: the open parts, or a plain "no part" so the line never ends on a dot.
  const parts = [
    ...summary.groups.map((group) => t(`readers.parts.${group}`)),
    ...summary.fieldNames,
  ];
  const partsLine = parts.length === 0 ? t('readers.characters.noParts') : parts.join(', ');
  return `${from} · ${partsLine}`;
}

/** The face, the name, the meta line and "Change". */
function RowHead({
  slug,
  character,
  line,
  isOpen,
  controlsId,
  onChange,
}: {
  slug: string;
  character: StoryCharacter;
  line: string;
  isOpen: boolean;
  controlsId: string;
  onChange: () => void;
}) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex items-center gap-4">
      <CharacterFace id={character.id} name={character.name} character={character} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          id={`atlas-reader-name-${character.id}`}
          to={`/plan/s/${slug}/characters/${character.id}`}
          className="type-body font-semibold wrap-anywhere text-ink-heading no-underline hover:underline"
        >
          {character.name}
        </Link>
        <MetaLine
          facts={[{ text: t(`characters.role.${character.role}`), kind: 'state' }, { text: line }]}
        />
      </div>
      <Button
        variant="secondary"
        className="shrink-0"
        aria-expanded={isOpen}
        aria-controls={controlsId}
        aria-label={t('readers.characters.changeNamed', { name: character.name })}
        onClick={onChange}
      >
        {t(isOpen ? 'readers.characters.done' : 'readers.characters.change')}
      </Button>
    </div>
  );
}

/**
 * Renders the row.
 *
 * @returns the list item, with its controls once "Change" is pressed
 */
export function ReaderCharacterRow({
  slug,
  character,
  fields,
  visibility,
}: ReaderCharacterRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const summary = readerSummaryOf({
    item: visibility.items[character.id],
    openParts: visibility.sheetParts[character.id] ?? [],
    fields,
    chapters: visibility.chapters,
  });
  const line = useSummaryLine(summary);
  const controlsId = `atlas-reader-character-${character.id}`;
  return (
    <li
      className="flex flex-col gap-3 border-t border-hairline py-3"
      data-testid="atlas-reader-character"
    >
      <RowHead
        slug={slug}
        character={character}
        line={line}
        isOpen={isOpen}
        controlsId={controlsId}
        onChange={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <div id={controlsId} className="flex flex-col gap-4">
          <ItemVisibilityControls
            slug={slug}
            itemId={character.id}
            itemName={character.name}
            allowsGuard
          />
          {summary.kind === 'shown' && (
            <SheetPartsControls slug={slug} characterId={character.id} fields={fields} />
          )}
        </div>
      )}
    </li>
  );
}
