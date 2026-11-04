/**
 * useCampaignReport: one campaign's daily impressions and clicks (story S1-E12-03; bundle
 * SPONSORS-c).
 *
 * Who calls it: components/staff/CampaignReport.tsx.
 * What it calls next: fetchCampaignReport() → admin_sponsor_campaign_report(), which only owner
 * and admin may call.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchCampaignReport } from '../api/sponsors';

import { sponsorsQueryKey } from './useSponsorsAdmin';

/**
 * Reads the report, again each time the page opens.
 *
 * @param campaignId - the campaign
 * @returns the query; data is the days, oldest first
 */
export function useCampaignReport(campaignId: string) {
  return useQuery({
    queryKey: [...sponsorsQueryKey, 'report', campaignId],
    queryFn: async () => fetchCampaignReport(await requireClient(), campaignId),
  });
}
