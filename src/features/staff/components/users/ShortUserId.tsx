/**
 * ShortUserId: an account's user ID in short form (its first 8 characters) with a Copy button that
 * copies the whole ID (story S1-E11-02; architecture 1.6: staff see the ID shortened, with a copy
 * button; it is never shown publicly).
 *
 * Who shows it: AccountSummaryRows. What it calls: the browser's clipboard. A short status line
 * says "Copied", or how to copy by hand when the browser refuses.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

/** How the last copy went. */
type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Renders the short ID and the button.
 *
 * @param props.userId - the full user ID
 * @returns the ID line
 */
export function ShortUserId({ userId }: { userId: string }) {
  const { t } = useTranslation('staff');
  const [copyState, setCopyState] = useState<CopyState>('idle');

  /** Copies the whole ID; a refused clipboard is said in words, never ignored. */
  async function copy() {
    try {
      await navigator.clipboard.writeText(userId);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <code className="font-mono text-heading" title={userId}>
        {userId.slice(0, 8)}
      </code>
      <Button variant="secondary" onClick={() => void copy()}>
        {t('users.account.copyId')}
      </Button>
      <span role="status" className="text-sm text-meta">
        {copyState === 'copied' && t('users.account.copied')}
        {copyState === 'failed' && t('users.account.copyFailed', { userId })}
      </span>
    </span>
  );
}
