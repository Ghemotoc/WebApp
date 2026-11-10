/**
 * useRelationshipWords: how a relationship is put into words on every Connections view (story
 * S1-E17-14): a full sentence for the lists ("Ana is the parent of Vali") and a short label for
 * the map's lines ("Parent of", or the writer's own label for a custom one). A cousin says which
 * cousin ("second cousin once removed"), and an "Other" relationship with a reverse label reads
 * the other way round on the second character's sheet ("Ilinca: goddaughter of Ana" on Ilinca's,
 * "Ana: godmother of Ilinca" everywhere else; G10b).
 *
 * Who calls it: RelationshipList, RelationshipMap and FamilyTreeView. What it calls: the
 * "connections" texts in src/locales/<language>/atlas.json.
 */
import type { CharacterRelationship, StoryCast } from '../api/characters';
import { cousinPhrase } from '../lib/cousinWords';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The three ways the views need a relationship or a character in words. */
export interface RelationshipWords {
  /** A character's name, from their ID. */
  nameOf: (characterId: string) => string;
  /**
   * The whole relationship as a sentence. With a viewpoint (the sheet's character), an "Other"
   * relationship that has a reverse label is told from that character's side.
   */
  sentence: (relationship: CharacterRelationship, viewpointId?: string) => string;
  /** The short label on the map's line. */
  label: (relationship: CharacterRelationship) => string;
}

/**
 * Builds the word helpers for one story's cast.
 *
 * @param cast - the story's characters
 * @returns nameOf, sentence and label
 */
export function useRelationshipWords(cast: StoryCast): RelationshipWords {
  const { t } = useAtlasTranslation();
  const names = new Map(cast.characters.map((character) => [character.id, character.name]));

  /** The name, or nothing for a character that has just been deleted. */
  const nameOf = (characterId: string) => names.get(characterId) ?? '';

  /** The type's label, or the writer's own label for a custom relationship. */
  const label = (relationship: CharacterRelationship) =>
    relationship.kind === 'custom'
      ? relationship.customLabel
      : t(`connections.kinds.${relationship.kind}`);

  /** "<from> is <kind> <to>", worded for each type and language. */
  const sentence = (relationship: CharacterRelationship, viewpointId?: string) => {
    // Step 1: seen from the second character, an "Other" one with a reverse label flips round.
    const isReversed =
      relationship.kind === 'custom' &&
      relationship.reverseLabel !== '' &&
      viewpointId === relationship.toId;
    const fromId = isReversed ? relationship.toId : relationship.fromId;
    const toId = isReversed ? relationship.fromId : relationship.toId;
    // Step 2: the sentence for the type, with the label and, for a cousin, which cousin.
    return t(`connections.sentences.${relationship.kind}`, {
      from: nameOf(fromId),
      to: nameOf(toId),
      label: isReversed ? relationship.reverseLabel : relationship.customLabel,
      which: cousinPhrase(t, relationship.cousinDegree, relationship.cousinRemoved),
    });
  };

  return { nameOf, sentence, label };
}
