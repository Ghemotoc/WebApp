/**
 * PassageLinkButton: "Copy link to this passage" in the share bar (story S1-E4-11, first
 * criterion; board 3.6, "Menu for selected text").
 *
 * It copies /s/<story>/<chapter>/p<first>-<last> for the blocks the selection covers: no sharer
 * ID and no tracking code (legal note). Whoever opens the link reads the chapter from that
 * passage, highlighted, and chat apps show the passage in the preview. A passage is at most five
 * blocks; past that the bar says so instead. The copy counts as a share of the chapter (S1-E4-05).
 * Who uses it: QuoteShareBar, while the writer lets passages be shared. What it calls:
 * lib/shareLink.ts, lib/clipboard.ts and, after the copy, lib/countShare.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { MAXIMUM_SHARED_BLOCKS, type SpotRange } from '@/lib/chapter-blocks';

import type { ChapterAddress } from '../api/sharing';
import { copyText } from '../lib/clipboard';
import { passageShareLink } from '../lib/shareLink';

/** What happened after the last press. */
type CopyOutcome = 'none' | 'copied' | 'failed';

/**
 * Renders the button, or why a link can't be made for this selection.
 *
 * @param props.address - the chapter
 * @param props.blocks - the blocks the selection covers, or null when they can't be told
 * @returns the button and its outcome line
 */
export function PassageLinkButton({
  address,
  blocks,
}: {
  address: ChapterAddress;
  blocks: SpotRange | null;
}) {
  const { t } = useTranslation('sharing');
  const [outcome, setOutcome] = useState<CopyOutcome>('none');
  if (blocks === null) return null;
  if (blocks.last - blocks.first >= MAXIMUM_SHARED_BLOCKS) {
    return <p className="m-0 py-2.5 text-sm text-body">{t('button.passageTooLong')}</p>;
  }

  /** Copies the link, says so, and counts the share in the background. */
  async function copyLink(range: SpotRange) {
    const copied = await copyText(passageShareLink(address, range));
    setOutcome(copied ? 'copied' : 'failed');
    if (copied) {
      void import('../lib/countShare').then((module) => module.countShare(address, 'copy_link'));
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void copyLink(blocks)}
      >
        {t('button.passageLink')}
      </Button>
      <span role="status" className="text-sm text-body">
        {outcome === 'copied' && t('button.passageCopied')}
        {outcome === 'failed' && t('button.passageCopyFailed')}
      </span>
    </>
  );
}
