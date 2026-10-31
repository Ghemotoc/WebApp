/**
 * WordsProgress: the words written against the story's target (story S1-E17-06: "as a number and
 * a progress bar with a text equivalent").
 *
 * The number is real text ("12,400 of 90,000 words"), and the bar is a <progress> element whose
 * value screen readers announce, with the percentage written beside it, so nothing depends on
 * the bar alone. Numbers use the interface language's separators (DoD: locale-aware numbers).
 * Who uses it: StoryAtlasPage. What it calls: lib/planProgress.ts.
 */
import { percentOfTarget } from '../lib/planProgress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the words card.
 *
 * @returns the heading, the count, the bar and the percentage
 */
export function WordsProgress({
  wordsWritten,
  wordTarget,
}: {
  wordsWritten: number;
  wordTarget: number;
}) {
  const { t, i18n } = useAtlasTranslation();
  const numbers = new Intl.NumberFormat(i18n.language);
  const percent = percentOfTarget(wordsWritten, wordTarget);
  return (
    <section
      aria-labelledby="atlas-words-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2 id="atlas-words-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('words.heading')}
      </h2>
      <p className="m-0 font-heading text-[20px] font-bold text-ink">
        {t('words.count', {
          written: numbers.format(wordsWritten),
          target: numbers.format(wordTarget),
        })}
      </p>
      <progress
        className="tmc-atlas-progress h-3 w-full"
        max={100}
        value={percent}
        aria-labelledby="atlas-words-heading"
        aria-describedby="atlas-words-percent"
      />
      <p id="atlas-words-percent" className="m-0 text-sm text-meta">
        {t('words.percent', { percent })}
      </p>
    </section>
  );
}
