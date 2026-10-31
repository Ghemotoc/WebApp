/**
 * LoadedQuoteDialog: the quote card or its limit pop-up, with their texts, in a file of its own
 * (story S1-E4-07).
 *
 * Why its own file: the card's drawing and texts are only needed once a reader presses
 * "Share quote", so QuoteShareBar fetches this file then and the chapter reader stays inside its
 * 40 KB script budget (e2e/reader-performance.spec.ts).
 * What it shows: the limit pop-up when the reader already made a card from this chapter (Q17),
 * otherwise the card; if the database says "already made" while the card is open (another
 * device), it switches to the pop-up.
 * Who uses it: QuoteShareBar, through React.lazy. What it calls: registerSharingTranslations,
 * QuoteCardDialog and QuoteLimitDialog.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SharedChapter } from '../lib/sharedChapter';
import { registerSharingTranslations } from '../registerSharingTranslations';

import { QuoteCardDialog } from './QuoteCardDialog';
import { QuoteLimitDialog } from './QuoteLimitDialog';

/** What the dialogs need. */
export interface LoadedQuoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: SharedChapter;
  passage: string;
  /** True when the reader already made a card from this chapter. */
  isAlreadyMade: boolean;
}

/**
 * Registers the sharing texts, then draws the card or the limit.
 *
 * @returns one dialog
 */
export function LoadedQuoteDialog(props: LoadedQuoteDialogProps) {
  const { i18n } = useTranslation();
  registerSharingTranslations(i18n);
  // The limit can also be found while the card is open, from make_quote_card()'s answer.
  const [hitLimit, setHitLimit] = useState(false);
  if (props.isAlreadyMade || hitLimit) {
    return (
      <QuoteLimitDialog isOpen={props.isOpen} onClose={props.onClose} chapter={props.chapter} />
    );
  }
  return (
    <QuoteCardDialog
      key={props.passage}
      isOpen={props.isOpen}
      onClose={props.onClose}
      chapter={props.chapter}
      passage={props.passage}
      onLimit={() => setHitLimit(true)}
    />
  );
}
