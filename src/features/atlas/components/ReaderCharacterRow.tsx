/**
 * ReaderCharacterRow: one character on "What readers can see" (story S1-E17-32; bundle G10 ATLAS,
 * part c4, board AtlasReaders).
 *
 * The character's name (a link to the sheet), one line saying what readers see ("Readers see it
 * from chapter 1 · Basics, Look and voice" or "Kept private") and "Change", which opens the same
 * controls the sheet has: "Keep private", "Readers see it from" and the sheet's part switches.
 * Who uses it: ReaderCharactersList. What it calls: readerSummaryOf, ItemVisibilityControls and
 * SheetPartsControls.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';

import type { CharacterField } from '../api/characters';
import type { PlanVisibility } from '../api/readerView';
import { readerSummaryOf, type ReaderSummary } from '../lib/readerSummary';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { ItemVisibilityControls } from './ItemVisibilityControls';
import { SheetPartsControls } from './SheetPartsControls';

/** What the row needs. */
export interface ReaderCharacterRowProps {
  slug: string;
  character: { id: string; name: string };
  fields: CharacterField[];
  visibility: PlanVisibility;
}

/** The summary as one line of words. */
function useSummaryLine(summary: ReaderSummary): string {
  const { t } = useAtlasTranslation();
  if (summary.kind === 'private') return t('readers.characters.keptPrivate');
  // Step 1: where it shows from.
  const from =
    summary.chapterNumber === null
      ? t('readers.characters.fromStart')
      : t('readers.characters.fromChapter', { number: summary.chapterNumber });
  // Step 2: the open parts, or a plain "no part" so the line never ends on a dot.
  const parts = [
    ...summary.groups.map((group) => t(`readers.parts.${group}`)),
    ...summary.fieldNames,
  ];
  const partsLine = parts.length === 0 ? t('readers.characters.noParts') : parts.join(', ');
  return `${from} · ${partsLine}`;
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
  const { t } = useAtlasTranslation();
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
      className="flex flex-col gap-3 border-t border-hairline px-5 py-4 first:border-t-0 md:px-6"
      data-testid="atlas-reader-character"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to={`/plan/s/${slug}/characters/${character.id}`}
            className="font-semibold break-words text-heading"
          >
            {character.name}
          </Link>
          <span className="text-sm text-body">{line}</span>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-4 text-[13px]"
          aria-expanded={isOpen}
          aria-controls={controlsId}
          aria-label={t('readers.characters.changeNamed', { name: character.name })}
          onClick={() => setIsOpen(!isOpen)}
        >
          {t(isOpen ? 'readers.characters.done' : 'readers.characters.change')}
        </Button>
      </div>
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
