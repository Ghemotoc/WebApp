/**
 * useRelationshipAdd: saves one new relationship for the two "add" forms, once, and says how it
 * went (GAPS-3 break test, 10 Nov 2026: a double click on "Add" recorded the same parent twice,
 * and so did adding it again).
 *
 * Who calls it: AddRelationshipForm and AddToTreeForm. What it calls: the form's onAdd
 * (useRelationshipChangers' relate), isAlreadyThere and useOneAtATime.
 */
import type { CharacterRelationship, NewRelationship } from '../api/characters';
import { refusalHintOf } from '../api/checkedAnswer';
import { isAlreadyThere } from '../lib/relationshipClash';

import { useOneAtATime } from './useOneAtATime';

/**
 * How a save went: 'added'; 'alreadyThere' (the same relationship is recorded once); 'failed'
 * (the connection, or the database refused it); 'busy' (another save is still running, so this
 * one did nothing). All but 'busy' are also the text keys under connections.add.
 */
export type RelationshipAddOutcome = 'added' | 'alreadyThere' | 'failed' | 'busy';

/**
 * The tone of the message for an outcome the form shows.
 *
 * @param outcome - how the save went
 * @returns 'success' once added, 'error' for everything else
 */
export function toneOf(outcome: RelationshipAddOutcome): 'success' | 'error' {
  return outcome === 'added' ? 'success' : 'error';
}

/**
 * The saver for one form.
 *
 * @param relationships - the story's relationships as the form has them
 * @param onAdd - saves the relationship; throws when it can't
 * @returns isBusy (a save is on its way; the form disables its button) and addOnce, which never
 *   throws: it resolves with how the save went
 */
export function useRelationshipAdd(
  relationships: readonly CharacterRelationship[],
  onAdd: (relationship: NewRelationship) => Promise<void>,
) {
  const { isBusy, run } = useOneAtATime();

  /** Saves the relationship unless it is already there or a save is running. */
  async function addOnce(relationship: NewRelationship): Promise<RelationshipAddOutcome> {
    // Step 1: the same relationship twice is refused here, before the database is asked.
    if (isAlreadyThere(relationships, relationship)) return 'alreadyThere';
    try {
      // Step 2: one save at a time, so a double click saves once.
      const hasRun = await run(() => onAdd(relationship));
      return hasRun ? 'added' : 'busy';
    } catch (error) {
      // Step 3: the database has the same rule (another tab may have added it meanwhile).
      return refusalHintOf(error) === 'already_there' ? 'alreadyThere' : 'failed';
    }
  }

  return { isBusy, addOnce };
}
