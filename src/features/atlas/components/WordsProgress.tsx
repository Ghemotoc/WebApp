/**
 * WordsProgress: the Words tile on the at-a-glance page: the words written against the story's
 * target (story S1-E17-06: "as a number and a progress bar with a text equivalent"; bundle G10a,
 * board AtlasStory: "Words", "31,400", "of 40,000 words · 78% of the word target").
 *
 * The number is real text, and the bar is a <progress> element whose value screen readers
 * announce, with the numbers and percentage written under it, so nothing depends on the bar alone.
 * Numbers use the interface language's separators (DoD: locale-aware numbers).
 * Who uses it: AtAGlance. What it calls: lib/planProgress.ts.
 */

import { percentOfTarget } from '../lib/planProgress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the words tile.
 *
 * @returns the eyebrow, the count, the bar and the line under it
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
      className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface px-6 py-[22px] shadow-card"
    >
      <h2 id="atlas-words-heading" className="eyebrow m-0">
        {t('words.heading')}
      </h2>
      <p className="m-0 font-heading text-[30px] leading-[1.1] font-extrabold text-heading">
        {numbers.format(wordsWritten)}
      </p>
      <p id="atlas-words-percent" className="m-0 text-sm text-meta">
        {t('words.count', {
          written: numbers.format(wordsWritten),
          target: numbers.format(wordTarget),
        })}{' '}
        · {t('words.percent', { percent })}
      </p>
      <progress
        className="tmc-atlas-progress h-2 w-full"
        max={100}
        value={percent}
        aria-labelledby="atlas-words-heading"
        aria-describedby="atlas-words-percent"
      />
    </section>
  );
}
