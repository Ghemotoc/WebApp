/**
 * DataRequestCopyForm: staff choose one ZIP of everything or each file on its own, then build and
 * send the copy in this tab (bundle ADMIN-2, part c2; story S1-E11-09: "staff can send one file
 * per story or one zip of all"; ADR 0012).
 *
 * Who shows it: DataRequestCopyPanel, only when the copy may be built. What it calls: onSend(),
 * which useDataRequestCopy runs in the background of this tab.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { DataRequestCopyFormat } from '../../lib/runDataRequestCopy';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

/** What the form needs. */
interface DataRequestCopyFormProps {
  isSending: boolean;
  onSend: (format: DataRequestCopyFormat) => void;
}

/** The two ways to send, in the order they are offered. */
const formats: DataRequestCopyFormat[] = ['zip', 'separate'];

/**
 * Renders the choice and the button; while the copy is built, a line asking to keep the tab open.
 *
 * @returns the form
 */
export function DataRequestCopyForm({ isSending, onSend }: DataRequestCopyFormProps) {
  const { t } = useDataRequestsTranslation();
  const [format, setFormat] = useState<DataRequestCopyFormat>('zip');

  /** Builds and sends the copy in the chosen format. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend(format);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold text-ink">{t('copy.formatLabel')}</legend>
        {formats.map((choice) => (
          <label key={choice} className="flex min-h-11 items-center gap-3 text-body">
            <input
              type="radio"
              name="data-request-copy-format"
              className="size-5"
              checked={format === choice}
              onChange={() => setFormat(choice)}
            />
            {t(`copy.formats.${choice}`)}
          </label>
        ))}
      </fieldset>
      {isSending && <Notice tone="info">{t('copy.building')}</Notice>}
      <Button type="submit" className="self-start" disabled={isSending}>
        {t('copy.send')}
      </Button>
    </form>
  );
}
