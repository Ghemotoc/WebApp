/**
 * AddRelationshipDialog: "Add a relationship" over a character's sheet or the family tree (user
 * stories bundle 6, story 6.5, board E24: "Add a relationship opens over the sheet: a dialog on
 * desktop and tablets, a sheet from the bottom on phones. Esc or Go back closes it"; story 6.7,
 * board E26: the tree's button "opens the same panel as on a sheet").
 *
 * The shared Sheet, centred from 600 px, holds the relationship form; on a sheet the sheet's
 * character is the first one, on the tree the writer picks both. The dialog stays open after a save, with "Relationship added." and a fresh
 * form, so the writer can add the next one; Close ×, Esc or Go back close it.
 * Who uses it: CharacterRelationshipsSection and FamilyTreeView. What it calls: Sheet and AddRelationshipForm.
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
  /** The sheet's character, fixed as the first one; left out on the tree, where both are picked. */
  characterId?: string;
  /** Keeps the form's ids apart from another form on the same page. */
  idPrefix?: string;
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
  idPrefix = 'atlas-sheet-relationship',
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
          idPrefix={idPrefix}
          cast={cast}
          fixedFromId={characterId}
          onAdd={onAdd}
          onCancel={onClose}
        />
      )}
    </Sheet>
  );
}
