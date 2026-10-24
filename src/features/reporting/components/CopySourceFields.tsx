/**
 * CopySourceFields: "Where was it copied from?", the optional source of a "Copied from a published
 * work" report: title, author, ISBN or link, and the passage in the published work; plus the
 * passage the reader selected in the story, attached automatically (story S1-E10-08; Robert,
 * canvas comment, 16 Oct 2026: every field optional, even just a title helps).
 *
 * Who shows it: ReportDialog (in the app) and ContentNoticeFields (the public form, without a
 * selected passage). What it calls: nothing; changes go back through onChange.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { copySourceLimits, type CopySource } from '@/schemas/report';

/** What the fields need. */
export interface CopySourceFieldsProps {
  /** Makes the field IDs unique on the page, for example "report" or "notice". */
  idPrefix: string;
  source: CopySource;
  onChange: (change: Partial<CopySource>) => void;
  /** The passage the reader selected, shown read-only; undefined where there is none to attach. */
  selectedPassage?: string | null;
  onRemovePassage?: () => void;
}

/**
 * The selected passage, quoted, with a button to leave it out.
 *
 * @returns the block, or nothing without a selection
 */
function SelectedPassage({
  passage,
  onRemove,
}: {
  passage: string | null | undefined;
  onRemove?: () => void;
}) {
  const { t } = useTranslation('reporting');
  if (passage === null || passage === undefined) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-sm font-semibold text-ink">{t('copied.selected')}</p>
      <blockquote className="m-0 max-h-40 overflow-y-auto rounded-[12px] border border-border bg-panel p-3 text-[15px] whitespace-pre-line text-body">
        {passage}
      </blockquote>
      {onRemove !== undefined && (
        <div>
          <Button variant="text" onClick={onRemove}>
            {t('copied.removeSelected')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the fields in a group with its own legend.
 *
 * @returns the fieldset
 */
export function CopySourceFields({
  idPrefix,
  source,
  onChange,
  selectedPassage,
  onRemovePassage,
}: CopySourceFieldsProps) {
  const { t } = useTranslation('reporting');
  return (
    <fieldset className="m-0 flex flex-col gap-4 rounded-card border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{t('copied.legend')}</legend>
      <p className="m-0 text-sm text-body">{t('copied.titleHelps')}</p>
      <SelectedPassage passage={selectedPassage} onRemove={onRemovePassage} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          id={`${idPrefix}-source-title`}
          label={t('copied.title')}
          maxLength={copySourceLimits.title}
          value={source.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <TextInput
          id={`${idPrefix}-source-author`}
          label={t('copied.author')}
          maxLength={copySourceLimits.author}
          value={source.author}
          onChange={(event) => onChange({ author: event.target.value })}
        />
      </div>
      <TextInput
        id={`${idPrefix}-source-reference`}
        label={t('copied.reference')}
        maxLength={copySourceLimits.reference}
        value={source.reference}
        onChange={(event) => onChange({ reference: event.target.value })}
      />
      <Textarea
        id={`${idPrefix}-source-passage`}
        label={t('copied.passage')}
        hint={t('copied.passageHint')}
        rows={3}
        maxLength={copySourceLimits.passage}
        value={source.passage}
        onChange={(event) => onChange({ passage: event.target.value })}
      />
    </fieldset>
  );
}
