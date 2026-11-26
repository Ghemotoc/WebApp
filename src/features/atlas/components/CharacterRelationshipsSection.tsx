/**
 * CharacterRelationshipsSection: "Relationships" on a character sheet (story S1-E17-14: "given a
 * relationship, when I view either character's sheet, then it is listed on both, and I can
 * delete it"; user stories bundle 6, stories 6.4 and 6.5, boards E23 and E24).
 *
 * Lists every relationship this character is in, whichever way it reads, then "Add a
 * relationship" and a line on where each one shows. The button opens AddRelationshipDialog over
 * the sheet; so does the top bar's Add a relationship on this page, through ?add=relationship in
 * the address, which the dialog's closing takes away again. The dialog sits outside the folding
 * section, so it opens even while the section is shut.
 * Who uses it: CharacterSheet. What it calls: useRelationshipChangers (relate and unrelate),
 * useRelationshipWords for the sentences and AddRelationshipDialog.
 */
import { useSearchParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';

import type { StoryCast } from '../api/characters';
import { useRelationshipChangers } from '../hooks/useRelationshipChangers';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddRelationshipDialog } from './AddRelationshipDialog';
import { FoldingCard } from './FoldingCard';
import { RelationshipList } from './RelationshipList';

/** The address's sign that the dialog is open: ?add=relationship (the top bar links to it). */
const addParameter = 'add';
const addValue = 'relationship';

/** Whether the dialog is open, kept in the address so the top bar's button can open it too. */
function useAddDialogState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get(addParameter) === addValue;
  /** Opens or closes the dialog without a new history step. */
  const setOpen = (open: boolean) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (open) next.set(addParameter, addValue);
        else next.delete(addParameter);
        return next;
      },
      { replace: true },
    );
  return { isOpen, setOpen };
}

/** What the section needs. */
export interface CharacterRelationshipsSectionProps {
  slug: string;
  cast: StoryCast;
  characterId: string;
}

/**
 * Renders the section.
 *
 * @returns the folding section with the character's relationships and Add a relationship, and
 *   the dialog
 */
export function CharacterRelationshipsSection({
  slug,
  cast,
  characterId,
}: CharacterRelationshipsSectionProps) {
  const { t } = useAtlasTranslation();
  const { relate, unrelate } = useRelationshipChangers(slug);
  const words = useRelationshipWords(cast);
  // Both ways: "Ana is the parent of Vali" shows on Ana's sheet, and on Vali's as "Vali is the
  // child of Ana" (GAPS-3).
  const mine = cast.relationships.filter(
    (relationship) => relationship.fromId === characterId || relationship.toId === characterId,
  );
  const { isOpen, setOpen } = useAddDialogState();
  return (
    <>
      {/* Folds shut with the count beside the title (CALM-9, board E23: "[N] relationships"). */}
      <FoldingCard
        title={t('connections.list.sheetHeading')}
        hint={t('characters.foldHints.relationships', { count: mine.length })}
      >
        <RelationshipList
          relationships={mine}
          words={words}
          onDelete={unrelate}
          viewpointId={characterId}
        />
        {cast.characters.length > 1 && (
          <>
            <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
              <ActionIcon name="link" />
              {t('connections.add.open')}
            </Button>
            <p className="m-0 type-meta">{t('connections.add.sheetNote')}</p>
          </>
        )}
      </FoldingCard>
      <AddRelationshipDialog
        isOpen={isOpen && cast.characters.length > 1}
        onClose={() => setOpen(false)}
        cast={cast}
        characterId={characterId}
        onAdd={relate}
      />
    </>
  );
}
