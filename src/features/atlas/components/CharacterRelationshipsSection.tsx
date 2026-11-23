/**
 * CharacterRelationshipsSection: "Relationships" on a character sheet (story S1-E17-14: "given a
 * relationship, when I view either character's sheet, then it is listed on both, and I can
 * delete it").
 *
 * Lists every relationship this character is in, whichever way it reads, then the form to add
 * one from this character to another. Who uses it: CharacterSheet. What it calls:
 * useRelationshipChangers (relate and unrelate) and useRelationshipWords for the sentences.
 */
import type { StoryCast } from '../api/characters';
import { useRelationshipChangers } from '../hooks/useRelationshipChangers';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { FoldingCard } from './FoldingCard';

import { AddRelationshipForm } from './AddRelationshipForm';
import { RelationshipList } from './RelationshipList';

/** What the section needs. */
export interface CharacterRelationshipsSectionProps {
  slug: string;
  cast: StoryCast;
  characterId: string;
}

/**
 * Renders the section.
 *
 * @returns the card with the character's relationships and the add form
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
  return (
    // Folds shut with the count beside the title (CALM-9, board E23: "[N] relationships").
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
          <h3 className="m-0 font-heading text-lg font-bold text-heading">
            {t('connections.add.heading')}
          </h3>
          <AddRelationshipForm
            idPrefix="atlas-sheet-relationship"
            cast={cast}
            fixedFromId={characterId}
            onAdd={relate}
          />
        </>
      )}
    </FoldingCard>
  );
}
