/**
 * QuoteShareBar: "Share quote" for the passage a reader selects (story S1-E4-07, first and third
 * criteria; board 3.6, "Menu for selected text").
 *
 * When the reader selects text in the chapter, a small bar appears at the bottom of the screen:
 * "Share quote" with "n of 280 characters", or, past 280, how many to drop. A fixed bar rather
 * than a menu beside the selection, so it never covers the text and works at every width and with
 * the keyboard. Pressing the button doesn't clear the selection (its mouse-down is held back).
 * It never appears when the writer switched quote cards off, for a visitor, or on a chapter the
 * reader can't read (quote_card_state() says not allowed).
 * Who uses it: QuoteShareWatcher, which fetches this file on the first selection. What it calls: useQuoteCardState,
 * useQuoteSelection and, on the first press, LoadedQuoteDialog (fetched then, for the reader's
 * 40 KB script budget).
 */
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { useQuoteCardState } from '../hooks/useQuoteCardState';
import { useQuoteSelection } from '../hooks/useQuoteSelection';
import type { SharedChapter } from '../lib/sharedChapter';
import { registerSharingTranslations } from '../registerSharingTranslations';

/** The card and the limit pop-up with their texts, fetched on the first press. */
const LoadedQuoteDialog = lazy(async () => {
  const module = await import('./LoadedQuoteDialog');
  return { default: module.LoadedQuoteDialog };
});

/** The passage being made into a card, and whether the limit was already reached then. */
interface OpenQuote {
  passage: string;
  isAlreadyMade: boolean;
}

/**
 * Renders the bar while a passage is selected, and the dialog once pressed.
 *
 * @returns the bar, the dialog, or nothing
 */
export function QuoteShareBar({ chapter }: { chapter: SharedChapter }) {
  const { t, i18n } = useTranslation('sharing');
  registerSharingTranslations(i18n);
  const state = useQuoteCardState(chapter.address);
  const selection = useQuoteSelection(state.allowed);
  // The dialog keeps the passage and the limit as they were when the reader pressed the button.
  const [openQuote, setOpenQuote] = useState<OpenQuote | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {selection !== null && !isOpen && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex max-w-full flex-wrap items-center gap-3 rounded-full border border-border bg-surface px-4 py-2 shadow-popover">
            {selection.fits ? (
              <>
                <span className="text-sm text-body">
                  {t('button.quoteCount', { count: selection.length })}
                </span>
                <Button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setOpenQuote({ passage: selection.passage, isAlreadyMade: state.alreadyMade });
                    setIsOpen(true);
                  }}
                >
                  {t('button.quoteButton')}
                </Button>
              </>
            ) : (
              <p className="m-0 py-2.5 text-sm text-body">
                {t('button.quoteTooLong', { count: selection.length })}
              </p>
            )}
          </div>
        </div>
      )}
      {openQuote !== null && (
        <Suspense fallback={null}>
          <LoadedQuoteDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            chapter={chapter}
            passage={openQuote.passage}
            isAlreadyMade={openQuote.isAlreadyMade}
          />
        </Suspense>
      )}
    </>
  );
}
