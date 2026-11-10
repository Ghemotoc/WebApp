/**
 * PublicWorldEntry: one entry of the story's world on its own page, as readers see it (story
 * S1-E17-33; bundle GAPS-4, board AtlasPreviewArea: "one world entry per page with 'More from
 * the world' beside it").
 *
 * A link back to the world, then the entry (its section's name as a quiet line, the title, the
 * tags, the text with [[Name]] links that open only public items, and Report), and beside it the
 * other public entries to read next. The preview leaves Report out and marks an entry waiting
 * for a chapter (S1-E17-35). Who uses it: PublicPlanView. What it calls: BibleMarkdown,
 * useBibleSectionName, ReportButton, PlanGuardPill and lib/worldEntries.ts.
 */
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { InfoPill } from '@/components/ui/InfoPill';
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

/** "More from the world": the other entries, each a link to its own page. */
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
    <aside aria-labelledby="atlas-world-more-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="atlas-world-more-heading" className="m-0 eyebrow">
        {t('publicPlan.world.more')}
      </h2>
      <ul className="m-0 flex list-none flex-col rounded-card border border-border bg-surface p-0 shadow-card">
        {others.map(({ entry, section }) => (
          <li key={entry.id} className="border-t border-hairline first:border-t-0">
            <Link
              to={`${base}/world/${entry.id}`}
              className="flex min-h-11 items-center justify-between gap-3 px-5 py-3 text-heading no-underline hover:bg-tint"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <b className="break-words">{entry.title}</b>
                <span className="text-sm break-words text-meta">{nameOf(section)}</span>
              </span>
              <ChevronRightIcon className="flex-none text-meta" />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * Renders the page.
 *
 * @returns the back link, the entry's article and "More from the world"
 */
export function PublicWorldEntry({ plan, placed, base, isPreview }: PublicWorldEntryProps) {
  const { t } = useAtlasTranslation();
  const nameOf = useBibleSectionName();
  const { entry, section } = placed;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        to={`${base}/world`}
        className="inline-flex h-9 items-center gap-1.5 self-start rounded-full border border-control-border bg-surface px-4 text-[13px] font-semibold text-heading no-underline hover:bg-tint"
      >
        <span aria-hidden="true">←</span>
        {t('publicPlan.world.back')}
      </Link>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article
          aria-labelledby="atlas-world-entry-heading"
          data-testid="atlas-public-entry"
          className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-5 py-6 shadow-card md:px-10 md:py-9"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <p className="m-0 text-sm break-words text-meta">{nameOf(section)}</p>
            <h2
              id="atlas-world-entry-heading"
              className="m-0 font-heading text-[clamp(28px,3vw,40px)] leading-[1.05] font-extrabold break-words text-heading"
            >
              {entry.title}
            </h2>
          </div>
          {(entry.tags.length > 0 || entry.showFrom !== null) && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <InfoPill key={tag} tone="neutral">
                  {tag}
                </InfoPill>
              ))}
              <PlanGuardPill guard={entry.showFrom} />
            </div>
          )}
          <BibleMarkdown text={entry.body} />
          {!isPreview && (
            <div className="self-start">
              <ReportButton
                itemType="atlas_item"
                itemReference={entry.id}
                itemLabel={entry.title}
              />
            </div>
          )}
        </article>
        <MoreFromWorld plan={plan} entryId={entry.id} base={base} />
      </div>
    </div>
  );
}
