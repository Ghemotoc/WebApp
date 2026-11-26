/**
 * PublicCharacterConnections: how one character is connected to the others readers can see
 * (user stories bundle 6, story 6.18, board E37).
 *
 * Rows between hairlines: the relationship in words as a link to the other character's page,
 * and its category under it ("Family", "Allies"). The plan only carries relationships between
 * characters readers can see, so every row's other character has a page. Who uses it:
 * PublicCharacter. What it calls: MetaLine, useRelationshipWords and categoryOf.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';

import type { PublicPlan } from '../api/publicPlan';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { categoryOf } from '../lib/relationshipCategories';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanGuardPill } from './PlanGuardPill';

/** What the list needs. */
export interface PublicCharacterConnectionsProps {
  plan: PublicPlan;
  characterId: string;
  /** The base address of the readers' (or the preview's) pages. */
  base: string;
}

/**
 * Renders the connections.
 *
 * @returns the heading and the rows, or nothing when the character has none shown
 */
export function PublicCharacterConnections({
  plan,
  characterId,
  base,
}: PublicCharacterConnectionsProps) {
  const { t } = useAtlasTranslation();
  const words = useRelationshipWords(plan.cast);
  // Step 1: the relationships this character is part of, either way round.
  const own = plan.cast.relationships.filter(
    (relationship) => relationship.fromId === characterId || relationship.toId === characterId,
  );
  if (own.length === 0) return null;
  // Step 2: one row each, the sentence told from this character's side where it can be.
  return (
    <section aria-labelledby="atlas-public-links-heading" className="flex min-w-0 flex-col gap-4">
      <h3
        id="atlas-public-links-heading"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('publicPlan.character.connections')}
      </h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {own.map((relationship) => {
          const otherId =
            relationship.fromId === characterId ? relationship.toId : relationship.fromId;
          return (
            <li
              key={relationship.id}
              className="flex min-w-0 flex-col gap-1 border-t border-hairline py-3"
            >
              <Link
                to={`${base}/characters/${otherId}`}
                className="self-start type-label font-semibold wrap-anywhere text-ink-heading no-underline hover:underline"
              >
                {words.sentence(relationship, characterId)}
              </Link>
              <MetaLine
                facts={[
                  {
                    text: t(`connections.categories.${categoryOf(relationship.kind)}`),
                    kind: 'state',
                  },
                ]}
              />
              <div className="self-start empty:hidden">
                <PlanGuardPill guard={plan.itemGuards[relationship.id]} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
