/**
 * DiscountCode: a sponsor's discount code as text, with a Copy button (bundle SPONSORS, part b3;
 * story S1-E12-02; board AdFormats "code CITESTE10").
 *
 * The code is real text, so it can also be selected by hand. Copying says "Copied" in a polite
 * live region; when the browser refuses the clipboard, it says so and the code stays on screen.
 * Who shows it: SponsorAdCreative.
 */
import { useState } from 'react';

import { useAdsTranslation } from '../registerAdsTranslations';

/** What the last Copy did. */
type CopyOutcome = 'none' | 'copied' | 'failed';

/**
 * Renders the code and its button.
 *
 * @param props.code - the discount code (letters, digits and hyphens, checked by the server)
 * @returns the code row
 */
export function DiscountCode({ code }: { code: string }) {
  const { t } = useAdsTranslation();
  const [outcome, setOutcome] = useState<CopyOutcome>('none');
  // Step 1: copy to the clipboard, and say how it went.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setOutcome('copied');
    } catch {
      setOutcome('failed');
    }
  };
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-body">
      <span>
        {t('sponsor.code')}{' '}
        <code className="rounded-md border border-border px-1.5 py-0.5 font-mono font-semibold text-ink">
          {code}
        </code>
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={t('sponsor.copyLabel', { code })}
        className="inline-flex min-h-8 items-center rounded-full border border-control-border bg-surface px-3 text-[13px] font-semibold text-heading focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t('sponsor.copy')}
      </button>
      <span role="status" className="text-meta">
        {outcome === 'copied' && t('sponsor.copied')}
        {outcome === 'failed' && t('sponsor.copyFailed')}
      </span>
    </span>
  );
}
