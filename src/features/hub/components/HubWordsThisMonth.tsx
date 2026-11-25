/**
 * HubWordsThisMonth: "Words written this month" in the Writers' hub's hero (user story 1.3,
 * board A03-WritersHub: "Words written this month replaces the old count").
 *
 * The heading, "6,240 of 15,000 words", the thread on its track and "5-day streak · 42% of the
 * goal". The numbers are the writer's own and private (GAPS-12f).
 * Who shows it: HubWritersHero. What it calls: useHubMonth and Meter.
 */
import { MetaLine } from '@/components/ui/MetaLine';
import { Meter } from '@/components/ui/Meter';
import { Notice } from '@/components/ui/Notice';
import { dateLocaleFor } from '@/lib/romania-time';

import { monthPercent } from '../api/hubMonth';
import { useHubMonth } from '../hooks/useHubMonth';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * Renders the month's words.
 *
 * @returns the section, or nothing while the numbers load
 */
export function HubWordsThisMonth() {
  const { t, i18n } = useHubTranslation();
  const { month, loadFailed } = useHubMonth();
  if (loadFailed) return <Notice tone="error">{t('hub.month.loadFailed')}</Notice>;
  if (month === null) return null;
  // Step 1: the numbers in the reader's own way of writing them ("6,240" or "6.240").
  const numbers = new Intl.NumberFormat(dateLocaleFor(i18n.language));
  const percent = monthPercent(month.words, month.goal);
  const words = numbers.format(month.words);
  const goal = numbers.format(month.goal);
  // Step 2: the streak first, then how much of the goal is done.
  const streak =
    month.streakDays > 0
      ? t('hub.month.streak', { count: month.streakDays })
      : t('hub.month.noStreak');
  return (
    <section aria-labelledby="hub-month" className="flex flex-col gap-2">
      <h2 id="hub-month" className="m-0 type-subheading">
        {t('hub.month.eyebrow')}
      </h2>
      <p className="m-0 type-label text-ink-heading">
        {t('hub.month.wordsOfGoal', { words, goal })}
      </p>
      <Meter
        label={t('hub.month.progressLabel', { percent, goal })}
        value={percent}
        valueText={t('hub.month.percentOfGoal', { percent })}
        className="my-3 h-2 rounded-full bg-tint [&>span]:rounded-full"
      />
      <MetaLine facts={[{ text: streak }, { text: t('hub.month.percentOfGoal', { percent }) }]} />
    </section>
  );
}
