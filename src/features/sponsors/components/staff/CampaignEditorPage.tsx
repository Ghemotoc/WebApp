/**
 * CampaignEditorPage: one sponsor campaign, new or saved (story S1-E12-02 criteria 1 and 2;
 * bundle SPONSORS-b2; board AdminSponsors "Set up a campaign").
 *
 * At /staff/sponsors/campaigns/new it starts an empty campaign; after the first save it moves to
 * the campaign's own address, where the picture can be added. An ended campaign is shown read-only
 * in the list and can't change here. Plain staff components, no doodles.
 * Who shows it: the router (owner and admin; the server refuses everyone else). What it calls:
 * useSponsorsData(), CampaignForm and EndCampaignForm.
 */
import { Link, useNavigate, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { StaffCampaign } from '@/schemas/sponsors';

import { useSponsorsData } from '../../hooks/useSponsorsAdmin';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { CampaignForm } from './CampaignForm';
import { EndCampaignForm } from './EndCampaignForm';

/** Everything the form offers, once loaded; "error" when a read failed; null while loading. */
function useEditorReads() {
  const { campaigns, sponsors, contests, categories } = useSponsorsData();
  if ([campaigns, sponsors, contests, categories].some((read) => read.isError)) return 'error';
  if (campaigns.data === undefined || sponsors.data === undefined) return null;
  if (contests.data === undefined || categories.data === undefined) return null;
  return {
    campaigns: campaigns.data,
    sponsors: sponsors.data,
    contests: contests.data,
    categorySlugs: categories.data,
  };
}

/** The notice shown instead of the form, or null when the form can show. */
function editorBlockerKey(
  campaign: StaffCampaign | null,
  isNew: boolean,
  sponsorCount: number,
): string | null {
  if (!isNew && campaign === null) return 'editor.notFound';
  if (isNew && sponsorCount === 0) return 'editor.noSponsors';
  if (campaign?.state === 'ended') return 'editor.readOnly';
  return null;
}

/** The form, once every list it offers has loaded. */
function CampaignEditorBody({ campaignId }: { campaignId: string }) {
  const { t } = useSponsorTranslation();
  const navigate = useNavigate();
  const reads = useEditorReads();
  // Step 1: everything the form offers, or a plain error.
  if (reads === 'error') return <Notice tone="error">{t('loadFailed')}</Notice>;
  if (reads === null) return null;
  // Step 2: the campaign, unless it is new; an unknown or ended one shows a line instead.
  const isNew = campaignId === 'new';
  const campaign = isNew ? null : (reads.campaigns.find((one) => one.id === campaignId) ?? null);
  const blockerKey = editorBlockerKey(campaign, isNew, reads.sponsors.length);
  if (blockerKey !== null) return <Notice tone="info">{t(blockerKey)}</Notice>;
  return (
    <div className="flex flex-col gap-8">
      <CampaignForm
        key={campaign?.id ?? 'new'}
        campaign={campaign}
        sponsors={reads.sponsors}
        contests={reads.contests}
        categorySlugs={reads.categorySlugs}
        onCreated={(newId) =>
          void navigate(`/staff/sponsors/campaigns/${newId}`, { replace: true })
        }
      />
      {campaign !== null && <EndCampaignForm campaignId={campaign.id} />}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the campaign editor
 */
export function CampaignEditorPage() {
  const { t } = useSponsorTranslation();
  const { campaignId = 'new' } = useParams();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('editor.documentTitle')}</title>
      <Link to="/staff/sponsors" className="text-sm text-link underline">
        {t('editor.back')}
      </Link>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {campaignId === 'new' ? t('editor.newHeading') : t('editor.heading')}
        </h1>
        <p className="m-0 text-body">{t('editor.intro')}</p>
      </div>
      <div className="max-w-[960px]">
        <CampaignEditorBody campaignId={campaignId} />
      </div>
    </PageContainer>
  );
}
