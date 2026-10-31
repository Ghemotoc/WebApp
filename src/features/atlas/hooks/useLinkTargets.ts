/**
 * useLinkTargets: what [[Name]] links in the open story point to, as an index (story S1-E17-31).
 *
 * Read once per story and kept while the writer works; every change the Atlas makes to a name
 * or title is a change on another page, which reads it again on arrival.
 * Who calls it: CrossLinkText, CrossLinkChips and BibleMarkdown. What it calls:
 * api/links.ts → story_link_targets(); lib/crossLinks.ts for the index.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchLinkTargets, linkTargetsQueryKey } from '../api/links';
import { buildLinkIndex, type LinkIndex } from '../lib/crossLinks';

/**
 * Follows a story's link targets.
 *
 * @param slug - the story's address
 * @returns index (empty while loading or when the read failed: links then read "not found yet"
 *   until it arrives) and isLoaded
 */
export function useLinkTargets(slug: string): { index: LinkIndex; isLoaded: boolean } {
  const { userId } = useSession();
  const targets = useQuery({
    queryKey: linkTargetsQueryKey(userId, slug),
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchLinkTargets(await requireClient(), slug),
  });
  const index = useMemo(() => buildLinkIndex(targets.data ?? []), [targets.data]);
  return { index, isLoaded: targets.isSuccess };
}
