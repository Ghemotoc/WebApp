/**
 * PublicConnections: the relationship map or the family tree a writer shares (story S1-E17-33:
 * "the relationship map with its list version, the family tree … read-only and with nothing
 * private in it").
 *
 * The same drawings as the writer's Connections page. The map comes with its list version, each
 * relationship with the shared Report button (S1-E17-34; the preview leaves it out); a node or
 * box opens the character's public page while Characters is public, and is just the name
 * otherwise. Who uses it: PublicPlanView. What it calls: RelationshipMap, FamilyTreeView,
 * useRelationshipWords and ReportButton.
 */
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { PublicPlan } from '../api/publicPlan';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { FamilyTreeView } from './FamilyTreeView';
import { RelationshipMap } from './RelationshipMap';

/** What the area needs. */
export interface PublicConnectionsProps {
  plan: PublicPlan;
  kind: 'map' | 'tree';
  base: string;
  isPreview: boolean;
}

/**
 * Renders the map with its list, or the tree.
 *
 * @returns the area's content
 */
export function PublicConnections({ plan, kind, base, isPreview }: PublicConnectionsProps) {
  const { t } = useAtlasTranslation();
  const words = useRelationshipWords(plan.cast);
  // A node opens the character's page only while Characters is public.
  const addressOf = (characterId: string) =>
    plan.areas.includes('characters') ? `${base}/characters/${characterId}` : null;
  if (kind === 'tree') {
    return <FamilyTreeView addressOf={addressOf} cast={plan.cast} words={words} />;
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <RelationshipMap addressOf={addressOf} cast={plan.cast} words={words} />
      <section aria-labelledby="atlas-public-list-heading" className="flex flex-col gap-2">
        <h2
          id="atlas-public-list-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('connections.list.heading')}
        </h2>
        {plan.cast.relationships.length === 0 && (
          <p className="m-0 text-body">{t('connections.list.none')}</p>
        )}
        <ul className="m-0 list-none p-0">
          {plan.cast.relationships.map((relationship) => (
            <li
              key={relationship.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0"
            >
              <span className="min-w-0 break-words text-ink">{words.sentence(relationship)}</span>
              {!isPreview && (
                <ReportButton
                  itemType="atlas_item"
                  itemReference={relationship.id}
                  itemLabel={words.sentence(relationship)}
                />
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
