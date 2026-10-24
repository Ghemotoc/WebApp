/**
 * The small parts both kinds of notice share: the long text field with its error, the good-faith
 * box and the hidden honeypot (story S1-E10-02). The label and message helpers are in
 * hooks/useNoticeFieldText.ts.
 *
 * Who shows them: ContentNoticeFields and RemovalOrderFields. What they call: nothing; each hands
 * its change back to NoticeForm.
 */
import { useTranslation } from 'react-i18next';

import { Textarea } from '@/components/ui/Textarea';
import { noticeLimits } from '@/schemas/notice';

/** What the long text field needs. */
export interface ExplanationFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  errorMessage: string | undefined;
  onChange: (value: string) => void;
}

/**
 * The long text field ("Why do you think it's illegal?" or the order's text) with its error.
 *
 * @returns the field group
 */
export function ExplanationField({
  id,
  label,
  hint,
  value,
  errorMessage,
  onChange,
}: ExplanationFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Textarea
        id={id}
        label={label}
        hint={hint}
        rows={5}
        value={value}
        maxLength={noticeLimits.explanation}
        aria-invalid={errorMessage === undefined ? undefined : true}
        aria-describedby={errorMessage === undefined ? `${id}-hint` : `${id}-hint ${errorId}`}
        onChange={(event) => onChange(event.target.value)}
      />
      {errorMessage !== undefined && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * The good-faith statement (DSA art. 16(2)(d)), a real checkbox with a 24 px box.
 *
 * @returns the box, its label and its error
 */
export function GoodFaithCheckbox({
  isChecked,
  errorMessage,
  onChange,
}: {
  isChecked: boolean;
  errorMessage: string | undefined;
  onChange: (isChecked: boolean) => void;
}) {
  const { t } = useTranslation('notices');
  const errorId = errorMessage === undefined ? undefined : 'notice-good-faith-error';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id="notice-good-faith"
          type="checkbox"
          checked={isChecked}
          aria-describedby={errorId}
          aria-invalid={errorMessage === undefined ? undefined : true}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
        />
        <label htmlFor="notice-good-faith" className="text-[15px] text-body">
          {t('form.goodFaith')}
        </label>
      </div>
      {errorMessage !== undefined && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * The hidden honeypot field: people never see it, bots fill it. Moved off screen, out of the tab
 * order and hidden from screen readers (not display:none, which some bots skip), as on Contact us.
 *
 * @returns the hidden field
 */
export function NoticeHoneypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('notices');
  return (
    <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
      <label htmlFor="notice-website">{t('form.website')}</label>
      <input
        id="notice-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
