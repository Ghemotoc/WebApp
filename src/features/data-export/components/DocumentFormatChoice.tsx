/**
 * DocumentFormatChoice: "Format" in Settings › Download my stories (bundle ADMIN-2, part d; story
 * S1-E11-09b; Robert, 2 Nov 2026: PDF wherever a Word file is offered). Three radio buttons:
 * Word (the default, the file a writer edits and the accessible one), PDF (looks the same on
 * every device, ready to print or send) or both. It applies to the chapters and the plan; the
 * JSON copy is always JSON.
 * Who shows it: DownloadMyStoriesBlock, when the chapters or the plan are ticked. What it calls:
 * nothing.
 */
import type { DocumentFormat } from '../api/dataExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

/** The three formats in the order they are shown. */
const formats: DocumentFormat[] = ['word', 'pdf', 'both'];

/** What the radio buttons need: the chosen format and how to change it. */
interface DocumentFormatChoiceProps {
  value: DocumentFormat;
  onChange: (format: DocumentFormat) => void;
}

/**
 * Renders the radio group.
 *
 * @returns the "Format" group
 */
export function DocumentFormatChoice({ value, onChange }: DocumentFormatChoiceProps) {
  const { t } = useDataExportTranslation();
  return (
    <fieldset
      className="m-0 flex min-w-0 flex-col border-0 p-0"
      aria-describedby="download-format-hint"
    >
      <legend className="mb-1 font-eyebrow text-sm leading-[1.3] text-eyebrow">
        {t('stories.format.legend')}
      </legend>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {formats.map((format) => (
          <div key={format} className="flex min-h-11 items-center gap-2.5">
            <input
              id={`download-format-${format}`}
              type="radio"
              name="download-format"
              className="h-5 w-5"
              checked={value === format}
              onChange={() => onChange(format)}
            />
            <label htmlFor={`download-format-${format}`} className="text-[15px] text-heading">
              {t(`stories.format.${format}`)}
            </label>
          </div>
        ))}
      </div>
      <span id="download-format-hint" className="text-sm text-meta">
        {t('stories.format.hint')}
      </span>
    </fieldset>
  );
}
