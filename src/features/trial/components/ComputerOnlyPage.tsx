/**
 * ComputerOnlyPage: "For now, the test runs on a computer", with Copy link (TRIAL-DESKTOP;
 * board J33, drawn by DESIGN on canvas v47).
 *
 * Who uses it: DesktopOnlyGate, on a phone or a touch-only tablet while the desktop_only flag is
 * on. It fills the screen on its own: the logo, the heading, one line, Copy link and "Phones and
 * tablets are coming later", on the one box surface (CALM-1c).
 * What it calls: BrandMark, Button, ActionIcon and the browser's clipboard.
 * Copy link copies the address the person opened, so they can send it to themselves and open it
 * on a computer at the same page.
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { brand } from '@/config/brand';
import { BrandMark } from '@/features/branding/components/BrandMark';

import { useTrialTranslation } from '../registerTrialTranslations';

/** What Copy link last did: nothing yet, copied, or the browser refused. */
type CopyState = 'idle' | 'copied' | 'failed';

/**
 * The page.
 *
 * @returns the computers-only page
 */
export function ComputerOnlyPage() {
  const { t } = useTrialTranslation();
  const [copyState, setCopyState] = useState<CopyState>('idle');

  /** Copies the page's address; says so, or says to copy it by hand when the browser refuses. */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <title>{t('computerOnly.documentTitle', { productName: brand.productName })}</title>
      <section
        aria-labelledby="computer-only-heading"
        className="flex w-full max-w-[600px] flex-col items-start gap-4 rounded-card border border-border bg-surface p-4 lg:p-8"
      >
        <BrandMark />
        <h1
          id="computer-only-heading"
          className="m-0 type-title text-ink-heading min-[1024px]:type-display"
        >
          {t('computerOnly.heading')}
        </h1>
        <p className="m-0 type-body text-ink-muted">{t('computerOnly.body')}</p>
        {/* The button and its answer sit together, so the empty answer leaves only a small gap. */}
        <div className="flex flex-col items-start gap-2">
          <Button onClick={() => void copyLink()}>
            <ActionIcon name="link" />
            {t('computerOnly.copyLink')}
          </Button>
          {/* Read out when it changes, so a screen reader hears that the link was copied. */}
          <p role="status" className="m-0 type-meta text-ink-muted">
            {copyState === 'copied' && t('computerOnly.copied')}
            {copyState === 'failed' && t('computerOnly.copyFailed')}
          </p>
        </div>
        <p className="m-0 type-meta text-ink-muted">{t('computerOnly.later')}</p>
      </section>
    </div>
  );
}
