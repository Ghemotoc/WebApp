/**
 * useRulesWalkthrough: whether a comment or forum post box should stop for the four rules cards
 * before an under-18's first post, and the walkthrough's state (bundle MUST-1, part c;
 * IDEA-20261108-7).
 *
 * The database says who needs it (needs_rules_walkthrough(): under 18 and not yet finished or
 * skipped). The cards are help pages in the CMS (keys starting rules-walkthrough-), read only for
 * someone who needs them, so adults never download them. The walkthrough never blocks a post for
 * long: when the cards can't be read, the box posts as usual; Skip and Done both record it, so it
 * never shows again; and the words in the box stay where they are throughout.
 * Who calls it: useCommentComposer and the forum ReplyForm and NewThreadForm; each shows
 * RulesWalkthrough while isShown is true.
 * What it calls: api/rulesWalkthrough.ts and useWebsiteContent.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { useWebsiteContent } from '@/features/website/hooks/useWebsiteContent';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import {
  finishRulesWalkthrough,
  needsRulesWalkthrough,
  rulesCardKeyPrefix,
} from '../api/rulesWalkthrough';

/** The cache key of "does this person need it", per person. */
export function rulesWalkthroughKey(userId: string | null) {
  return ['rules-walkthrough', userId] as const;
}

/** One card: a heading and its text in the safe Markdown subset, in one language. */
export interface RulesCard {
  key: string;
  title: string;
  body: string;
  language: string;
}

/**
 * Reads the cards, but only for someone who will see them.
 *
 * @param isNeeded - true when the person needs the walkthrough
 * @returns the cards in their order (empty while loading or when there are none)
 */
function useRulesCards(isNeeded: boolean): RulesCard[] {
  const pages = useWebsiteContent('help_page', helpPageContentSchema, { enabled: isNeeded });
  // Step 1: keep the walkthrough's pages; the numbers in their keys put them in order.
  const own = pages.entries.filter((page) => page.entryKey.startsWith(rulesCardKeyPrefix));
  own.sort((first, second) => first.entryKey.localeCompare(second.entryKey));
  // Step 2: only what the card shows.
  return own.map((page) => ({
    key: page.entryKey,
    title: page.content.title,
    body: page.content.body,
    language: page.languageCode,
  }));
}

/**
 * Follows the walkthrough for one box.
 *
 * @returns isShown, the cards, shouldHold() for the box's submit, and finish() for Skip and Done
 */
export function useRulesWalkthrough() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [isShown, setIsShown] = useState(false);
  const needs = useQuery({
    queryKey: rulesWalkthroughKey(userId),
    enabled: userId !== null,
    retry: false,
    staleTime: Infinity,
    queryFn: async () => needsRulesWalkthrough(await requireClient()),
  });
  const isNeeded = needs.data === true;
  const cards = useRulesCards(isNeeded);
  const recording = useMutation({
    mutationFn: async () => finishRulesWalkthrough(await requireClient()),
  });

  return {
    isShown,
    cards,
    /**
     * Decides whether the box stops for the walkthrough before sending.
     *
     * @returns true when the walkthrough is open and the box should wait
     */
    shouldHold(): boolean {
      // While the answer or the cards load, or if either can't be read, never hold a post back.
      if (!isNeeded || cards.length === 0) return false;
      setIsShown(true);
      return true;
    },
    /** Skip or Done: closes it and records it, so no box shows it again. */
    finish() {
      setIsShown(false);
      // Every box reads the same answer, so they all stop asking at once, even before the save
      // ends; a failed save means the walkthrough comes back on the next visit, never a lost post.
      queryClient.setQueryData(rulesWalkthroughKey(userId), false);
      recording.mutate();
    },
  };
}

/** What useRulesWalkthrough returns, for RulesWalkthrough. */
export type RulesWalkthroughState = ReturnType<typeof useRulesWalkthrough>;

/**
 * The walkthrough wrapped around a form's submit, for the forum post boxes: the walkthrough first,
 * then the form's own submit (which may still ask about personal details, MUST-1b).
 *
 * @param submit - the form's own submit
 * @returns rules, for RulesWalkthrough, and submit(event) for the form
 */
export function useRulesBeforeSubmit(submit: (event?: { preventDefault: () => void }) => void) {
  const rules = useRulesWalkthrough();
  return {
    rules,
    /** The form's submit: stops for the walkthrough before an under-18's first post. */
    submit: (event?: { preventDefault: () => void }) => {
      event?.preventDefault();
      if (rules.shouldHold()) return;
      submit();
    },
  };
}
