/**
 * PublicPlanView: one area of a story's public plan, as readers see it (stories S1-E17-32 and
 * S1-E17-33), shared by the readers' pages and the writer's "Preview as a reader".
 *
 * The row of public areas, then the open area: the cast or one character, the relationship map
 * with its list, the family tree, the world or the timeline. Around it, ReaderLinksContext makes
 * every [[Name]] resolve against the public items only, so a private item reads as plain words.
 * Who uses it: PublicPlanPage and PlanPreviewPage. What it calls: the Public* area components,
 * PublicPlanNav and lib/publicPlanAreas.ts.
 */
import { useMemo } from 'react';

import type { PlanArea, PublicPlan } from '../api/publicPlan';
import { ReaderLinksContext, type ReaderLinks } from '../hooks/useCrossLinks';
import { buildLinkIndex } from '../lib/crossLinks';
import { publicLinkTargets, publicTargetAddress } from '../lib/publicPlanAreas';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PublicCast } from './PublicCast';
import { PublicCharacter } from './PublicCharacter';
import { PublicConnections } from './PublicConnections';
import { PublicPlanNav } from './PublicPlanNav';
import { PublicTimeline } from './PublicTimeline';
import { PublicWorld } from './PublicWorld';

/** What the view needs. */
export interface PublicPlanViewProps {
  plan: PublicPlan;
  area: PlanArea;
  /** One character's page within Characters, or undefined for the cast. */
  characterId: string | undefined;
  /** The base address: /s/<story>/atlas for readers, the preview's own for the writer. */
  base: string;
  isPreview: boolean;
}

/** The characters area: the cast, one character, or a plain line for one who isn't shown. */
function CharactersArea({ plan, characterId, base, isPreview }: Omit<PublicPlanViewProps, 'area'>) {
  const { t } = useAtlasTranslation();
  if (characterId === undefined) return <PublicCast plan={plan} base={base} />;
  const character = plan.cast.characters.find((candidate) => candidate.id === characterId);
  if (character === undefined)
    return <p className="m-0 text-body">{t('publicPlan.character.notShown')}</p>;
  return <PublicCharacter plan={plan} character={character} base={base} isPreview={isPreview} />;
}

/** The open area's content. */
function AreaContent(props: PublicPlanViewProps) {
  const { plan, area, base, isPreview } = props;
  if (area === 'characters') return <CharactersArea {...props} />;
  if (area === 'relationship_map' || area === 'family_tree') {
    const kind = area === 'family_tree' ? 'tree' : 'map';
    return <PublicConnections plan={plan} kind={kind} base={base} isPreview={isPreview} />;
  }
  if (area === 'bible') return <PublicWorld plan={plan} isPreview={isPreview} />;
  return <PublicTimeline plan={plan} isPreview={isPreview} />;
}

/**
 * Renders the area with its navigation.
 *
 * @returns the area links and the open area, inside the readers' link context
 */
export function PublicPlanView(props: PublicPlanViewProps) {
  const { plan, base } = props;
  // The links know only what this page shows.
  const links = useMemo<ReaderLinks>(
    () => ({
      index: buildLinkIndex(publicLinkTargets(plan)),
      addressOf: (target) => publicTargetAddress(target, plan, base),
    }),
    [plan, base],
  );
  return (
    <ReaderLinksContext.Provider value={links}>
      <div className="flex min-w-0 flex-col gap-6">
        <PublicPlanNav base={base} areas={plan.areas} current={props.area} />
        <AreaContent {...props} />
      </div>
    </ReaderLinksContext.Provider>
  );
}
