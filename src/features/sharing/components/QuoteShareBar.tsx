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
 * Since S1-E4-11 it also has "Copy link to this passage" (PassageLinkButton), at any length up to
 * five blocks. Both share the writer's passage switch, which is off for 16+ and 18+ stories.
 * IDEAS-3f adds "Discuss in the forums" (DiscussPassageButton, IDEA-20261102-10) for a public story,
 * asked with usePassageDiscussion.
 * Who uses it: QuoteShareWatcher, which fetches this file on the first selection. What it calls: useQuoteCardState,
 * useQuoteSelection and, on the first press, LoadedQuoteDialog (fetched then, for the reader's
 * 40 KB script budget).
 */
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { usePassageDiscussion } from '../hooks/usePassageDiscussion';
import { useQuoteCardState } from '../hooks/useQuoteCardState';
import { useQuoteSelection } from '../hooks/useQuoteSelection';
import type { QuoteSelection } from '../lib/quoteSelection';
import type { SharedChapter } from '../lib/sharedChapter';
import { registerSharingTranslations } from '../registerSharingTranslations';

import { DiscussPassageButton } from './DiscussPassageButton';
import { PassageLinkButton } from './PassageLinkButton';

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
 * The quote part of the bar: the count and "Share quote", or how far over 280 the passage is.
 *
 * @param props.selection - what is selected
 * @param props.onQuote - opens the card
 * @returns the count and button, or the too-long line
 */
function QuotePart({ selection, onQuote }: { selection: QuoteSelection; onQuote: () => void }) {
  const { t } = useTranslation('sharing');
  if (!selection.fits) {
    return (
      <p className="m-0 py-2.5 text-sm text-body">
        {t('button.quoteTooLong', { count: selection.length })}
      </p>
    );
  }
  return (
    <>
      <span className="text-sm text-body">
        {t('button.quoteCount', { count: selection.length })}
      </span>
      <Button onMouseDown={(event) => event.preventDefault()} onClick={onQuote}>
        {t('button.quoteButton')}
      </Button>
    </>
  );
}

/**
 * Renders the bar while a passage is selected, and the dialog once pressed.
 *
 * @returns the bar, the dialog, or nothing
 */
export function QuoteShareBar({ chapter }: { chapter: SharedChapter }) {
  const { i18n } = useTranslation('sharing');
  registerSharingTranslations(i18n);
  const state = useQuoteCardState(chapter.address);
  const selection = useQuoteSelection(state.allowed);
  const mayDiscuss = usePassageDiscussion(chapter.address);
  // The dialog keeps the passage and the limit as they were when the reader pressed the button.
  const [openQuote, setOpenQuote] = useState<OpenQuote | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {selection !== null && !isOpen && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex max-w-full flex-wrap items-center gap-3 rounded-[28px] border border-border bg-surface px-4 py-2 shadow-popover">
            <QuotePart
              selection={selection}
              onQuote={() => {
                setOpenQuote({ passage: selection.passage, isAlreadyMade: state.alreadyMade });
                setIsOpen(true);
              }}
            />
            <PassageLinkButton address={chapter.address} blocks={selection.blocks} />
            {mayDiscuss && <DiscussPassageButton chapter={chapter} selection={selection} />}
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
