/**
 * useSponsorsAdmin: everything Staff › Sponsors reads and changes (story S1-E12-02; bundle
 * SPONSORS-b2).
 *
 * Who calls it: StaffSponsorsPage and CampaignEditorPage. What it calls: api/sponsors.ts and, for
 * the creative, uploadSponsorCreative(). After every change it reads the sponsors, campaigns and
 * blocked list again, so each section shows the server's answer, never a guess.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { PictureUploadError, uploadSponsorCreative } from '@/features/pictures/api/pictures';
import type { CampaignFields } from '@/schemas/sponsors';

import {
  SponsorError,
  addBlockedCategory,
  endCampaign,
  fetchBlockedCategories,
  fetchCampaigns,
  fetchCategorySlugs,
  fetchSponsorableContests,
  fetchSponsors,
  removeBlockedCategory,
  reviewCampaign,
  saveCampaign,
  saveSponsor,
  submitCampaign,
  type CampaignReview,
} from '../api/sponsors';

/** The key every Sponsors read shares, so one change refreshes them all. */
export const sponsorsQueryKey = ['staff', 'sponsors'] as const;

/**
 * Any error as a SponsorError, so the screens read one shape.
 *
 * @param error - the mutation's error, or null
 * @returns the SponsorError, or null when there was none
 */
export function sponsorFailureOf(error: Error | null): SponsorError | null {
  if (error === null) return null;
  if (error instanceof SponsorError) return error;
  // A failed upload keeps its own reason (wrong_type, too_big, too_many, …).
  if (error instanceof PictureUploadError)
    return new SponsorError(error.failure, error.message, []);
  return new SponsorError('failed', error.message, []);
}

/**
 * The reads of Staff › Sponsors.
 *
 * @returns the sponsors, campaigns, blocked list, contests and category slugs
 */
export function useSponsorsData() {
  const read = <Result>(name: string, load: () => Promise<Result>) => ({
    queryKey: [...sponsorsQueryKey, name],
    queryFn: load,
  });
  const sponsors = useQuery(read('sponsors', async () => fetchSponsors(await requireClient())));
  const campaigns = useQuery(read('campaigns', async () => fetchCampaigns(await requireClient())));
  const blocked = useQuery(
    read('blocked', async () => fetchBlockedCategories(await requireClient())),
  );
  const contests = useQuery(
    read('contests', async () => fetchSponsorableContests(await requireClient())),
  );
  const categories = useQuery(
    read('categories', async () => fetchCategorySlugs(await requireClient())),
  );
  return { sponsors, campaigns, blocked, contests, categories };
}

/** Every change Staff › Sponsors can make, one at a time. */
export type SponsorChange =
  | { kind: 'save_sponsor'; id: string | null; name: string; websiteUrl: string }
  | { kind: 'save_campaign'; campaignId: string | null; fields: CampaignFields }
  | { kind: 'upload_creative'; campaignId: string; file: File }
  | { kind: 'submit'; campaignId: string }
  | ({ kind: 'review' } & CampaignReview)
  | { kind: 'end'; campaignId: string; reason: string }
  | { kind: 'add_blocked'; key: string; labelRo: string; labelEn: string }
  | { kind: 'remove_blocked'; key: string; reason: string };

/**
 * Runs one change against the server.
 *
 * @param change - what to do
 * @returns the saved campaign's ID and problems for save_campaign, otherwise nothing useful
 */
async function runChange(
  change: SponsorChange,
): Promise<{ id: string; problems: string[] } | null> {
  const client = await requireClient();
  switch (change.kind) {
    case 'save_sponsor':
      await saveSponsor(client, change);
      return null;
    case 'save_campaign':
      return saveCampaign(client, change.campaignId, change.fields);
    case 'upload_creative':
      await uploadSponsorCreative(client, { campaignId: change.campaignId, file: change.file });
      return null;
    case 'submit':
      await submitCampaign(client, change.campaignId);
      return null;
    case 'review':
      await reviewCampaign(client, change);
      return null;
    case 'end':
      await endCampaign(client, change.campaignId, change.reason);
      return null;
    case 'add_blocked':
      await addBlockedCategory(client, change);
      return null;
    case 'remove_blocked':
      await removeBlockedCategory(client, change.key, change.reason);
      return null;
  }
}

/**
 * The changes of Staff › Sponsors.
 *
 * @returns change() (resolves with the saved campaign for save_campaign), the last change, its
 *   failure and whether one is running
 */
export function useSponsorChanges() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: runChange,
    // Whatever happened, read everything again.
    onSettled: () => queryClient.invalidateQueries({ queryKey: sponsorsQueryKey }),
  });
  return {
    change: mutation.mutateAsync,
    lastChange: mutation.variables ?? null,
    isDone: mutation.isSuccess,
    failure: sponsorFailureOf(mutation.error),
    isRunning: mutation.isPending,
    reset: mutation.reset,
  };
}
