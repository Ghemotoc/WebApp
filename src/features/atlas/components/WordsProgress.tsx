/**
 * WordsProgress: the Words block in the story card at the top of the at-a-glance page: the words
 * written against the story's target (story S1-E17-06: "as a number and a progress bar with a text
 * equivalent"; redrawn as board E21 in user stories bundle 6: "Words", "31,640 of 40,000", the
 * bar, "79% of the word target").
 *
 * The numbers are real text, and the bar is a <progress> element whose value screen readers
 * announce, with the percentage written under it, so nothing depends on the bar alone.
 * Numbers use the interface language's separators (DoD: locale-aware numbers).
 * Who uses it: StorySummary. What it calls: lib/planProgress.ts.
 */

import { percentOfTarget } from '../lib/planProgress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the words block.
 *
 * @param props.wordsWritten - words in the story's chapters
 * @param props.wordTarget - the plan's word target
 * @returns the label, the numbers, the bar and the line under it
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
    <div className="flex min-w-0 flex-col gap-1">
      <h3 id="atlas-words-heading" className="m-0 type-label text-ink-heading">
        {t('words.heading')}
      </h3>
      <p className="m-0 type-subheading text-ink-heading">
        {t('words.numbers', {
          written: numbers.format(wordsWritten),
          target: numbers.format(wordTarget),
        })}
      </p>
      <progress
        className="tmc-atlas-progress my-2 h-2 w-full"
        max={100}
        value={percent}
        aria-labelledby="atlas-words-heading"
        aria-describedby="atlas-words-percent"
      />
      <p id="atlas-words-percent" className="m-0 type-meta">
        {t('words.percent', { percent })}
      </p>
    </div>
  );
}
