/**
 * PublicWorldEntry: one entry of the story's world on its own page, as readers see it (story
 * S1-E17-33; bundle GAPS-4, board AtlasPreviewArea: "one world entry per page with 'More from
 * the world' beside it").
 *
 * The entry reads like a page (user stories bundle 6, story 6.17, board E36): its section's name
 * as a quiet line, the title, the text in the story's font with [[Name]] links that open only
 * public items, and Report; the writer's tags stay on the writer's side. Beside it, "More from the
 * world" lists the other public entries as rows. The preview leaves Report out and marks an entry
 * waiting for a chapter (S1-E17-35). Who uses it: PublicPlanView. What it calls: BibleMarkdown,
 * MetaLine, useBibleSectionName, ReportButton, PlanGuardPill and lib/worldEntries.ts.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { PublicPlan } from '../api/publicPlan';
import { useBibleSectionName } from '../hooks/useBibleSectionName';
import { moreFromWorld, type PlacedEntry } from '../lib/worldEntries';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BibleMarkdown } from './BibleMarkdown';
import { PlanGuardPill } from './PlanGuardPill';

/** What the page needs. */
export interface PublicWorldEntryProps {
  plan: PublicPlan;
  placed: PlacedEntry;
  /** The base address of the readers' (or the preview's) pages. */
  base: string;
  isPreview: boolean;
}

/** "More from the world": the other entries, each a row with its title and its section. */
function MoreFromWorld({
  plan,
  entryId,
  base,
}: {
  plan: PublicPlan;
  entryId: string;
  base: string;
}) {
  const { t } = useAtlasTranslation();
  const nameOf = useBibleSectionName();
  const others = moreFromWorld(plan, entryId);
  if (others.length === 0) return null;
  return (
    <aside aria-labelledby="atlas-world-more-heading" className="flex min-w-0 flex-col gap-4">
      <h2
        id="atlas-world-more-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('publicPlan.world.more')}
      </h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {others.map(({ entry, section }) => (
          <li key={entry.id} className="flex min-w-0 flex-col gap-1 border-t border-hairline py-3">
            <Link
              to={`${base}/world/${entry.id}`}
              className="self-start type-label font-semibold wrap-anywhere text-ink-heading no-underline hover:underline"
            >
              {entry.title}
            </Link>
            <MetaLine facts={[{ text: nameOf(section) }]} />
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * Renders the page.
 *
 * @returns the entry's article and "More from the world" beside it
 */
export function PublicWorldEntry({ plan, placed, base, isPreview }: PublicWorldEntryProps) {
  const nameOf = useBibleSectionName();
  const { entry, section } = placed;
  // Board E36: the entry reads like a page (about 680 px wide), "More from the world" beside it
  // on wide screens (1.6 to 1); the tabs above lead back to the world, so no back link.
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
      <article
        aria-labelledby="atlas-world-entry-heading"
        data-testid="atlas-public-entry"
        className="flex max-w-[680px] min-w-0 flex-col gap-3"
      >
        <p className="m-0 type-meta wrap-anywhere text-ink-muted">{nameOf(section)}</p>
        <h2
          id="atlas-world-entry-heading"
          className="m-0 font-heading type-title font-bold wrap-anywhere text-ink-heading"
        >
          {entry.title}
        </h2>
        {entry.showFrom !== null && (
          <div className="self-start">
            <PlanGuardPill guard={entry.showFrom} />
          </div>
        )}
        <BibleMarkdown text={entry.body} readsLikePage />
        {!isPreview && (
          <div className="self-start">
            <ReportButton itemType="atlas_item" itemReference={entry.id} itemLabel={entry.title} />
          </div>
        )}
      </article>
      <MoreFromWorld plan={plan} entryId={entry.id} base={base} />
    </div>
  );
}
