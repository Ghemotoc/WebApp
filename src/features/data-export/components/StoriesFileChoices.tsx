/**
 * StoriesFileChoices: "What to include" in Settings › Download my stories (story S1-E13-05;
 * Robert, 1 Nov 2026, 06:27 and 06:29): the chapters, the plan from Story Atlas and a
 * machine-readable copy (JSON). Each is a real checkbox with its hint; the chapters and the plan
 * come as Word, PDF or both, chosen below in DocumentFormatChoice (ADMIN-2d).
 * Who shows it: DownloadMyStoriesBlock, which keeps what is ticked. What it calls: nothing.
 */
import { useDataExportTranslation } from '../registerDataExportTranslations';

/** The three things a writer can tick. */
export interface FileChoices {
  includeChapters: boolean;
  includePlan: boolean;
  includeData: boolean;
}

/** One of the three, by name. */
type FileChoice = keyof FileChoices;

/** The three in the order they are shown, each with its text key. */
const choiceKeys: { choice: FileChoice; key: string }[] = [
  { choice: 'includeChapters', key: 'chapters' },
  { choice: 'includePlan', key: 'plan' },
  { choice: 'includeData', key: 'data' },
];

/** What the checkboxes need: what is ticked and how to change it. */
interface StoriesFileChoicesProps {
  choices: FileChoices;
  onChange: (choices: FileChoices) => void;
}

/**
 * Renders the checkboxes.
 *
 * @returns the "What to include" group
 */
export function StoriesFileChoices({ choices, onChange }: StoriesFileChoicesProps) {
  const { t } = useDataExportTranslation();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
      <legend className="mb-1 font-eyebrow text-sm leading-[1.3] text-eyebrow">
        {t('stories.include.legend')}
      </legend>
      {choiceKeys.map(({ choice, key }) => (
        <div
          key={choice}
          className="flex min-h-11 items-start gap-3 border-t border-hairline py-2.5 first-of-type:border-t-0"
        >
          <input
            id={`download-include-${key}`}
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0"
            checked={choices[choice]}
            aria-describedby={`download-include-${key}-hint`}
            onChange={(changed) => onChange({ ...choices, [choice]: changed.target.checked })}
          />
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor={`download-include-${key}`}
              className="text-[15px] font-semibold text-heading"
            >
              {t(`stories.include.${key}`)}
            </label>
            <span id={`download-include-${key}-hint`} className="text-sm text-meta">
              {t(`stories.include.${key}Hint`)}
            </span>
          </div>
        </div>
      ))}
    </fieldset>
  );
}
