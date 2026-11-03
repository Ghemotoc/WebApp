/**
 * useKindWordsNudge: whether the comment box should ask "Still want to send this?" before
 * sending (bundle ADMIN-2, part d3; Robert, 2 Nov 2026, 22:10: a gentle nudge, can still send).
 *
 * The check runs here, in the browser, against the lists staff keep on Staff › Settings. A match
 * opens the nudge; "Send anyway" sends exactly what was typed, and "Edit" goes back to the box.
 * Nothing is blocked, stored, logged or reported (CLAUDE.md rule 19).
 * Who calls it: CommentComposer. What it calls: api/nudgeWords.ts and lib/kindWords.ts.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchNudgePhrases } from '../api/nudgeWords';
import { hasUnkindWords } from '../lib/kindWords';

/** The lists change rarely; reading them again every ten minutes is plenty. */
const listFreshMilliseconds = 10 * 60 * 1000;

/**
 * Follows the lists and the nudge's state for one comment box.
 *
 * @returns isShown; shouldNudge(text), which opens the nudge and says so when the text has a
 *   phrase from the lists (only once per text: after Edit, a changed text is checked again);
 *   close(), for Edit and after sending
 */
export function useKindWordsNudge() {
  const [isShown, setIsShown] = useState(false);
  const [acceptedText, setAcceptedText] = useState<string | null>(null);
  const phrases = useQuery({
    queryKey: ['comment-nudge-words'],
    staleTime: listFreshMilliseconds,
    retry: false,
    queryFn: async () => fetchNudgePhrases(await requireClient()),
  });

  /**
   * Decides whether to stop for the nudge before sending.
   *
   * @param text - the comment as typed
   * @returns true when the nudge opened and the comment should wait for the person's choice
   */
  function shouldNudge(text: string): boolean {
    // "Send anyway" was pressed for exactly this text: send it.
    if (acceptedText === text) return false;
    // While the lists load, or if they can't be read, never hold a comment back.
    if (!hasUnkindWords(text, phrases.data ?? [])) return false;
    setIsShown(true);
    return true;
  }

  return {
    isShown,
    shouldNudge,
    /** Marks this text as chosen and closes the nudge; the composer then sends it. */
    acceptText: (text: string) => {
      setAcceptedText(text);
      setIsShown(false);
    },
    close: () => setIsShown(false),
  };
}
