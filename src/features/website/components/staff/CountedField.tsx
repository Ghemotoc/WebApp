/**
 * CountedField: a CMS text field with a character counter (story S1-E11-06 criterion 5;
 * architecture 1.8.6 step 2: "character counters are announced to screen readers").
 *
 * The counter sits under the field and is linked with aria-describedby, so a screen reader reads
 * "12 of 50 characters" with the field. Over the limit, or empty when required, the counter turns
 * red and the field is marked invalid; a problem the server named shows the same way.
 * Who uses it: every website editor.
 */
import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';

/** What a field needs. */
export interface CountedFieldProps {
  id: string;
  label: string;
  value: string;
  limit: number;
  onChange: (value: string) => void;
  /** A problem word from the server ("empty", "too_long", "broken_link"), or null. */
  serverProblem?: string | null;
  isMultiline?: boolean;
  /** The language of the text, when it differs from the interface. */
  lang?: string;
  hint?: string;
  rows?: number;
}

/**
 * The ids that describe a field: its hint, its error and its counter, in that order.
 *
 * @param id - the field's id
 * @param hasHint - whether the field has a hint
 * @param hasError - whether the field shows an error
 * @returns the space-separated ids for aria-describedby
 */
function describedByOf(id: string, hasHint: boolean, hasError: boolean): string {
  const ids = [`${id}-counter`];
  if (hasError) ids.unshift(`${id}-error`);
  if (hasHint) ids.unshift(`${id}-hint`);
  return ids.join(' ');
}

/**
 * The field's problem: the one the server named, or "too_long" when the text is over the limit.
 *
 * @returns the problem word, or null when the field is fine
 */
function problemOf(serverProblem: string | null, value: string, limit: number): string | null {
  if (serverProblem !== null) return serverProblem;
  return value.length > limit ? 'too_long' : null;
}

/**
 * Renders the field and its counter.
 *
 * @returns the field group
 */
export function CountedField({
  id,
  label,
  value,
  limit,
  onChange,
  serverProblem = null,
  isMultiline = false,
  lang,
  hint,
  rows = 4,
}: CountedFieldProps) {
  const { t } = useTranslation('websiteAdmin');
  // Step 1: the server's problem wins; otherwise the field is only wrong when it is too long.
  const problem = problemOf(serverProblem, value, limit);
  const errorMessage =
    problem === null
      ? undefined
      : t(`problems.${problem}`, { defaultValue: t('problems.invalid') });
  // Step 2: the field's description is its hint, its error and its counter.
  const describedBy = describedByOf(id, hint !== undefined, errorMessage !== undefined);
  const shared = {
    id,
    label,
    value,
    lang,
    hint,
    'aria-describedby': describedBy,
    'aria-invalid': problem === null ? undefined : true,
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {isMultiline ? (
        <>
          <Textarea {...shared} rows={rows} onChange={(event) => onChange(event.target.value)} />
          {errorMessage !== undefined && (
            <p id={`${id}-error`} className="m-0 text-sm text-destructive">
              {errorMessage}
            </p>
          )}
        </>
      ) : (
        <TextInput
          {...shared}
          errorMessage={errorMessage}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <span
        id={`${id}-counter`}
        className={cn('text-xs', problem === null ? 'text-meta' : 'text-destructive')}
      >
        {t('counter', { used: value.length, limit })}
      </span>
    </div>
  );
}
