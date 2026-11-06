/**
 * CampaignCreativeUpload: the campaign's picture, its check state and "Upload image" (story
 * S1-E12-02 criterion 1; CLAUDE.md rule 19).
 *
 * The picture goes to the private `sponsor-creatives` bucket under the campaign's ID, so a new
 * campaign is saved as a draft first. After the automatic check a moderator approves it; until
 * then the campaign can't be approved. Uploading is open only while the campaign is a draft or
 * sent back. Who shows it: CampaignForm. What it calls: useSponsorChanges() (upload_creative)
 * and CampaignPicture.
 */
import { useId } from 'react';

import { Notice } from '@/components/ui/Notice';
import type { StaffCampaign } from '@/schemas/sponsors';

import { useSponsorChanges } from '../../hooks/useSponsorsAdmin';
import { errorKeyOf } from '../../lib/sponsorWords';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { CampaignPicture } from './CampaignPicture';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The upload's outcome: uploading, done, or why it failed. */
function UploadOutcome({ changes }: { changes: ReturnType<typeof useSponsorChanges> }) {
  const { t } = useSponsorTranslation();
  if (changes.isRunning) return <Notice tone="info">{t('editor.uploading')}</Notice>;
  if (changes.failure !== null) {
    return <Notice tone="error">{t(errorKeyOf(changes.failure))}</Notice>;
  }
  if (changes.isDone) return <Notice tone="success">{t('editor.uploaded')}</Notice>;
  return null;
}

/**
 * Renders the picture block.
 *
 * @param campaign - the saved campaign, or null for one not saved yet
 * @returns the picture, its state and the file field
 */
export function CampaignCreativeUpload({ campaign }: { campaign: StaffCampaign | null }) {
  const { t } = useSponsorTranslation();
  const inputId = useId();
  const changes = useSponsorChanges();
  // Step 1: a new campaign has no folder yet.
  if (campaign === null)
    return <p className="m-0 text-sm text-meta">{t('editor.pictureFirstSave')}</p>;
  const mayUpload = campaign.state === 'draft' || campaign.state === 'sent_back';
  // Step 2: the chosen file is uploaded, registered and checked at once.
  const upload = (file: File | undefined) => {
    if (file === undefined) return;
    void changes
      .change({ kind: 'upload_creative', campaignId: campaign.id, file })
      .catch(errorShownByHook);
  };
  return (
    <div className="flex flex-col gap-3">
      {campaign.picture !== null && <CampaignPicture campaign={campaign} />}
      {mayUpload && (
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-sm font-semibold text-ink">
            {t('editor.pictureLabel')}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="min-h-11 text-sm"
            disabled={changes.isRunning}
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </div>
      )}
      <UploadOutcome changes={changes} />
    </div>
  );
}
