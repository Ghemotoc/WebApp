/**
 * PlanWordsBar: words written against a story's target as a thin bar with the numbers written
 * under it ("31,400 of 40,000 words"), so nothing depends on the bar alone (story S1-E17-06;
 * bundle G10a, boards AtlasHome and AtlasStory). Numbers use the interface language's separators
 * (DoD: locale-aware numbers).
 *
 * Who uses it: StoryPlanCard (/plan). What it calls:
 * lib/planProgress.ts.
 */
import { percentOfTarget } from '../lib/planProgress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the bar and the line under it.
 *
 * @param props.id - joins the bar to its line, unique on the page
 * @param props.wordsWritten - words in the story's chapters
 * @param props.wordTarget - the plan's word target
 * @param props.label - the bar's name for screen readers ("Words")
 * @returns the bar and the numbers
 */
export function PlanWordsBar({
  id,
  wordsWritten,
  wordTarget,
  label,
}: {
  id: string;
  wordsWritten: number;
  wordTarget: number;
  label: string;
}) {
  const { t, i18n } = useAtlasTranslation();
  const numbers = new Intl.NumberFormat(i18n.language);
  const percent = percentOfTarget(wordsWritten, wordTarget);
  return (
    <div className="flex flex-col gap-1.5">
      <progress
        className="tmc-atlas-progress h-2 w-full"
        max={100}
        value={percent}
        aria-label={label}
        aria-describedby={`${id}-numbers`}
      />
      <p id={`${id}-numbers`} className="m-0 text-sm text-meta">
        {t('words.count', {
          written: numbers.format(wordsWritten),
          target: numbers.format(wordTarget),
        })}
      </p>
    </div>
  );
}
