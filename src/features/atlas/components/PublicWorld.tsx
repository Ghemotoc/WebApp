/**
 * PublicWorld: the story bible a writer shares, in reading mode (story S1-E17-33: "the bible in
 * reading mode … read-only and with nothing private in it").
 *
 * Each public section is a heading with its public entries under it; an entry shows its tags and
 * its text with [[Name]] links that open only public items (a private one reads as plain words,
 * S1-E17-32). Each entry has the shared Report button, and so does a section the writer named
 * themselves (S1-E17-34); the preview leaves the buttons out and marks entries waiting for a
 * chapter. Who uses it: PublicPlanView. What it calls: BibleMarkdown, useBibleSectionName,
 * ReportButton and PlanGuardPill.
 */
import { InfoPill } from '@/components/ui/InfoPill';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { PublicEntry, PublicPlan } from '../api/publicPlan';
import { useBibleSectionName } from '../hooks/useBibleSectionName';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BibleMarkdown } from './BibleMarkdown';
import { PlanGuardPill } from './PlanGuardPill';

/** One entry: its title, tags, guard mark, text and Report. */
function WorldEntry({ entry, isPreview }: { entry: PublicEntry; isPreview: boolean }) {
  return (
    <article
      id={`atlas-world-entry-${entry.id}`}
      aria-labelledby={`atlas-world-entry-${entry.id}-heading`}
      className="flex min-w-0 scroll-mt-24 flex-col gap-3 border-t border-hairline pt-4 first:border-t-0 first:pt-0"
    >
      <h3
        id={`atlas-world-entry-${entry.id}-heading`}
        className="m-0 font-heading text-xl font-bold break-words text-heading"
      >
        {entry.title}
      </h3>
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
          <ReportButton itemType="atlas_item" itemReference={entry.id} itemLabel={entry.title} />
        </div>
      )}
    </article>
  );
}

/**
 * Renders the sections.
 *
 * @param props.plan - the public plan
 * @param props.isPreview - true in the writer's preview
 * @returns one card per section, or a plain line when nothing is shown
 */
export function PublicWorld({ plan, isPreview }: { plan: PublicPlan; isPreview: boolean }) {
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
          {section.entries.map((entry) => (
            <WorldEntry key={entry.id} entry={entry} isPreview={isPreview} />
          ))}
        </section>
      ))}
    </div>
  );
}
