/**
 * MarkdownField: a counted Markdown text area with a live preview beside it (stories S1-E11-06
 * and S1-E11-12; architecture 1.8.6 step 2, "a live preview").
 *
 * The preview uses the same CmsMarkdown the public pages use, so what staff see is what visitors
 * get. On narrow screens the preview sits under the field.
 * Who shows it: HelpPageForm and QuestionForm.
 */
import { useTranslation } from 'react-i18next';

import { CmsMarkdown } from '../CmsMarkdown';

import { CountedField } from './CountedField';

/** What the field needs. */
export interface MarkdownFieldProps {
  id: string;
  label: string;
  value: string;
  limit: number;
  rows: number;
  language: string;
  serverProblem: string | null;
  onChange: (value: string) => void;
}

/**
 * Renders the field and its preview.
 *
 * @returns the two side by side from 1280 px
 */
export function MarkdownField({
  id,
  label,
  value,
  limit,
  rows,
  language,
  serverProblem,
  onChange,
}: MarkdownFieldProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CountedField
        id={id}
        label={label}
        hint={t('markdownHint')}
        value={value}
        limit={limit}
        isMultiline
        rows={rows}
        lang={language}
        serverProblem={serverProblem}
        onChange={onChange}
      />
      <figure className="m-0 flex min-w-0 flex-col gap-2">
        <figcaption className="text-sm font-semibold text-ink">{t('help.preview')}</figcaption>
        <div className="rounded-3xl border border-border bg-paper p-5">
          <CmsMarkdown markdown={value} language={language} />
        </div>
      </figure>
    </div>
  );
}
