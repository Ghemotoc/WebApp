/**
 * PublicWorld: the story's world a writer shares, as a list readers browse (story S1-E17-33:
 * "the bible in reading mode … read-only and with nothing private in it"; bundle GAPS-4).
 *
 * Each public section is a heading with its public entries under it, each a link to the entry's
 * own page (PublicWorldEntry), with its tags. A section the writer named themselves has the
 * shared Report button (S1-E17-34); an entry's is on its own page. The preview leaves the
 * buttons out and marks entries waiting for a chapter. Who uses it: PublicPlanView. What it
 * calls: useBibleSectionName, ReportButton and PlanGuardPill.
 */
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { InfoPill } from '@/components/ui/InfoPill';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { PublicEntry, PublicPlan } from '../api/publicPlan';
import { useBibleSectionName } from '../hooks/useBibleSectionName';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanGuardPill } from './PlanGuardPill';

/** One entry's row: its title as the link to its page, then its tags and guard mark. */
function WorldEntryRow({ entry, base }: { entry: PublicEntry; base: string }) {
  return (
    <li
      data-testid="atlas-public-entry-row"
      className="flex min-w-0 flex-col gap-2 border-t border-hairline py-3 first:border-t-0 first:pt-0 last:pb-0"
    >
      <Link
        to={`${base}/world/${entry.id}`}
        className="flex min-h-11 items-center justify-between gap-3 font-heading text-xl font-bold text-heading no-underline hover:underline"
      >
        <span className="min-w-0 break-words">{entry.title}</span>
        <ChevronRightIcon className="flex-none text-meta" />
      </Link>
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
    </li>
  );
}

/**
 * Renders the sections.
 *
 * @param props.plan - the public plan
 * @param props.base - the base address of the readers' (or the preview's) pages
 * @param props.isPreview - true in the writer's preview
 * @returns one card per section, or a plain line when nothing is shown
 */
export function PublicWorld({
  plan,
  base,
  isPreview,
}: {
  plan: PublicPlan;
  base: string;
  isPreview: boolean;
}) {
  const { t } = useAtlasTranslation();
  const nameOf = useBibleSectionName();
  if (plan.sections.length === 0)
    return <p className="m-0 text-body">{t('publicPlan.world.none')}</p>;
  return (
    <div className="flex flex-col gap-6">
      {plan.sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`atlas-world-section-${section.id}`}
          className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-5 py-6 shadow-card md:px-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id={`atlas-world-section-${section.id}`}
              className="m-0 font-heading text-[26px] font-extrabold break-words text-heading"
            >
              {nameOf(section)}
            </h2>
            {/* A default section's name is ours; only the writer's own words can be reported. */}
            {!isPreview && section.name.trim() !== '' && (
              <ReportButton
                itemType="atlas_item"
                itemReference={section.id}
                itemLabel={section.name}
              />
            )}
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {section.entries.map((entry) => (
              <WorldEntryRow key={entry.id} entry={entry} base={base} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
