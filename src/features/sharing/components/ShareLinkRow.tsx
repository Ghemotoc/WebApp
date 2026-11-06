/**
 * ShareLinkRow: the link in a read-only field with "Copy link", and what happened to the last copy
 * (story S1-E4-05; board 3.6 Share). Moved to its own file in IDEAS-1c so the chapter and the
 * whole-story dialogs share it.
 * Who uses it: ShareDialog and StoryShareDialog. What it calls: lib/clipboard.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { copyText } from '../lib/clipboard';

/** What the row needs. */
export interface ShareLinkRowProps {
  link: string;
  /** Whether the Share button's copy worked: true, false, or null when it didn't try. */
  wasCopied: boolean | null;
}

/**
 * Renders the field row and the status line.
 *
 * @returns the row
 */
export function ShareLinkRow({ link, wasCopied }: ShareLinkRowProps) {
  const { t } = useTranslation('sharing');
  const [copied, setCopied] = useState(wasCopied);
  // The status line says whether the last copy worked; empty until something was tried.
  let status = '';
  if (copied === true) status = t('dialog.copied');
  if (copied === false) status = t('dialog.copyFailed');
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="share-link" className="eyebrow">
        {t('dialog.linkLabel')}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="share-link"
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
          className="h-11 min-w-0 flex-1 basis-56 rounded-full border border-control-border bg-paper px-4 text-sm text-ink"
        />
        <Button onClick={() => void copyText(link).then(setCopied)}>{t('dialog.copy')}</Button>
      </div>
      <p role="status" className="m-0 min-h-5 text-sm text-body">
        {status}
      </p>
    </div>
  );
}
