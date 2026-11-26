/**
 * FamilyTreeGenerations: "Generations", the family tree repeated in words under the drawing (user
 * stories bundle 6, story 6.7, board E26: "Generations repeats the tree in words for screen
 * readers and small screens").
 *
 * A heading, "The same tree in words." and one numbered line per generation, oldest first:
 * "Generation 1: Ion Pavel, Ana Pavel, Ilie Pavel". Everyone sees it, so a phone that shows only
 * part of the drawing still has the whole family.
 * Who uses it: FamilyTreeView. What it calls: the Atlas translations.
 */
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import type { FamilyTree } from '../lib/familyTree';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the list needs. */
export interface FamilyTreeGenerationsProps {
  tree: FamilyTree;
  words: RelationshipWords;
}

/**
 * Renders the section.
 *
 * @returns the heading, the note and the numbered generations
 */
export function FamilyTreeGenerations({ tree, words }: FamilyTreeGenerationsProps) {
  const { t } = useAtlasTranslation();
  return (
    // A hairline and 24 px above the heading, as board E26's .fgroup draws it.
    <section
      aria-labelledby="atlas-tree-generations"
      className="flex min-w-0 flex-col gap-2 border-t border-hairline pt-6"
    >
      <h2
        id="atlas-tree-generations"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('connections.tree.generationsLabel')}
      </h2>
      <p className="m-0 type-meta text-ink-muted">{t('connections.tree.generationsNote')}</p>
      <ol className="m-0 mt-2 list-decimal pl-6">
        {tree.generations.map((row, index) => (
          <li key={row.join('|')} className="type-body text-ink">
            {t('connections.tree.generation', {
              number: index + 1,
              names: row.map((id) => words.nameOf(id)).join(', '),
            })}
          </li>
        ))}
      </ol>
    </section>
  );
}
