/**
 * EndCampaignForm: "End campaign" with a reason, for a campaign that hasn't ended (story
 * S1-E12-02; bundle SPONSORS-b2).
 *
 * Ending takes a campaign off every page at once and can't be undone; the reason goes into the
 * audit log. Who shows it: CampaignEditorPage. What it calls: useSponsorChanges().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import { useSponsorChanges } from '../../hooks/useSponsorsAdmin';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { ChangeOutcome } from './ChangeOutcome';

/**
 * Renders the button, then the reason and the confirmation.
 *
 * @param campaignId - the campaign to end
 * @returns the end form
 */
export function EndCampaignForm({ campaignId }: { campaignId: string }) {
  const { t } = useSponsorTranslation();
  const changes = useSponsorChanges();
  const [isAsking, setIsAsking] = useState(false);
  const [reason, setReason] = useState('');
  if (!isAsking) {
    return (
      <div>
        <Button variant="destructive" onClick={() => setIsAsking(true)}>
          {t('editor.end')}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <TextInput
        id="campaign-end-reason"
        label={t('editor.endReason')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div>
        <Button
          variant="destructive"
          disabled={changes.isRunning}
          onClick={() =>
            void changes.change({ kind: 'end', campaignId, reason }).catch(() => undefined)
          }
        >
          {t('editor.confirmEnd')}
        </Button>
      </div>
      <ChangeOutcome
        successText={t('editor.ended')}
        isDone={changes.isDone}
        failure={changes.failure}
      />
    </div>
  );
}
