/**
 * AddRelationshipDialog: "Add a relationship" over a character's sheet (user stories bundle 6,
 * story 6.5, board E24: "Add a relationship opens over the sheet: a dialog on desktop and tablets,
 * a sheet from the bottom on phones. Esc or Go back closes it").
 *
 * The shared Sheet, centred from 600 px, holds the relationship form with the sheet's character
 * as the first one. The dialog stays open after a save, with "Relationship added." and a fresh
 * form, so the writer can add the next one; Close ×, Esc or Go back close it.
 * Who uses it: CharacterRelationshipsSection. What it calls: Sheet and AddRelationshipForm.
 */
import { Sheet } from '@/components/ui/Sheet';

import type { NewRelationship, StoryCast } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddRelationshipForm } from './AddRelationshipForm';

/** What the dialog needs. */
export interface AddRelationshipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cast: StoryCast;
  /** The sheet's character: the first one of the relationship. */
  characterId: string;
  /** Saves the relationship; throws when it can't. */
  onAdd: (relationship: NewRelationship) => Promise<void>;
}

/**
 * Renders the dialog; nothing shows while it is closed.
 *
 * @returns the Sheet with the form
 */
export function AddRelationshipDialog({
  isOpen,
  onClose,
  cast,
  characterId,
  onAdd,
}: AddRelationshipDialogProps) {
  const { t } = useAtlasTranslation();
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('connections.add.heading')}
      placement="centre"
    >
      {/* Mounted only while open, so each opening starts with a blank form. */}
      {isOpen && (
        <AddRelationshipForm
          idPrefix="atlas-sheet-relationship"
          cast={cast}
          fixedFromId={characterId}
          onAdd={onAdd}
          onCancel={onClose}
        />
      )}
    </Sheet>
  );
}
