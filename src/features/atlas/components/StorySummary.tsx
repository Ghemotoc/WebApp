/**
 * StorySummary: "The story" at the top of the at-a-glance page (story S1-E17-06: "it shows the
 * title, logline, genre, audience and publishing route").
 *
 * A fine line between each label and its value (DoD: label rows). It shows what is saved, so it
 * follows the fields below as each one saves.
 * Who uses it: StoryAtlasPage.
 */
import { useTranslation } from 'react-i18next';

import { LabelRows } from '@/components/ui/LabelRows';

import type { StoryPlanPage } from '../api/storyPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the summary.
 *
 * @returns the card with the logline and the label rows
 */
export function StorySummary({ page }: { page: StoryPlanPage }) {
  const { t } = useAtlasTranslation();
  const { t: tWriting } = useTranslation('writing');
  const { story, plan } = page;
  return (
    <section
      aria-labelledby="atlas-summary-heading"
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2
        id="atlas-summary-heading"
        className="m-0 font-heading text-[26px] leading-[1.1] font-bold text-heading"
      >
        {t('summary.heading')}
      </h2>
      <p className="m-0 text-[17px] leading-normal break-words text-body">
        {plan.logline === '' ? t('summary.noLogline') : plan.logline}
      </p>
      <LabelRows
        rows={[
          {
            label: t('summary.genre'),
            value: tWriting(`categories.${story.categorySlug}`, {
              defaultValue: story.categorySlug,
            }),
          },
          { label: t('summary.audience'), value: tWriting(`rating.${story.rating}`) },
          { label: t('summary.route'), value: t(`publishingRoute.${plan.publishingRoute}`) },
          { label: t('summary.status'), value: t(`writingStatus.${plan.writingStatus}`) },
        ]}
      />
    </section>
  );
}
