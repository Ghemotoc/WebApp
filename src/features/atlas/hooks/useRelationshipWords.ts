/**
 * useRelationshipWords: how a relationship is put into words on every Connections view (story
 * S1-E17-14): a full sentence for the lists ("Ana is the parent of Vali") and a short label for
 * the map's lines ("Parent of", or the writer's own label for a custom one).
 *
 * Who calls it: RelationshipList, RelationshipMap and FamilyTreeView. What it calls: the
 * "connections" texts in src/locales/<language>/atlas.json.
 */
import type { CharacterRelationship, StoryCast } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The three ways the views need a relationship or a character in words. */
export interface RelationshipWords {
  /** A character's name, from their ID. */
  nameOf: (characterId: string) => string;
  /** The whole relationship as a sentence. */
  sentence: (relationship: CharacterRelationship) => string;
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
  const sentence = (relationship: CharacterRelationship) =>
    t(`connections.sentences.${relationship.kind}`, {
      from: nameOf(relationship.fromId),
      to: nameOf(relationship.toId),
      label: relationship.customLabel,
    });

  return { nameOf, sentence, label };
}
