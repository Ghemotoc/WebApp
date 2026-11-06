/**
 * CampaignForm: one campaign's fields, "Save draft" and "Send for review" (story S1-E12-02
 * criteria 1 and 2; board AdminSponsors "Set up a campaign").
 *
 * Saving always keeps the campaign as a draft; a saved change to an approved or waiting campaign
 * puts it back in draft, so it needs a new review (the page says so above the buttons). Sending
 * for review is refused while anything is missing, and the list of what to fix stays on screen.
 * Who shows it: CampaignEditorPage. What it calls: useSponsorChanges() and the field groups.
 */
import { useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import type { CampaignFields, StaffCampaign } from '@/schemas/sponsors';

import type { SponsorableContest, Sponsor } from '../../api/sponsors';
import { useSponsorChanges } from '../../hooks/useSponsorsAdmin';
import { emptyCampaignFields, fieldsOfCampaign } from '../../lib/campaignFields';
import { problemKeyOf } from '../../lib/sponsorWords';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { CampaignCreativeUpload } from './CampaignCreativeUpload';
import {
  CampaignBasicsFields,
  CampaignLinkAndDatesFields,
  CampaignTargetingFields,
  CampaignWordsFields,
  type SetCampaignField,
} from './CampaignFieldGroups';
import { ChangeOutcome } from './ChangeOutcome';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
export interface CampaignFormProps {
  /** The saved campaign, or null for a new one. */
  campaign: StaffCampaign | null;
  sponsors: Sponsor[];
  contests: SponsorableContest[];
  categorySlugs: string[];
  /** Called with the new campaign's ID after its first save. */
  onCreated: (campaignId: string) => void;
}

/** A titled group of fields. */
function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-4 rounded-2xl border border-hairline p-4">
      <legend className="px-1 font-heading text-lg font-bold text-heading">{title}</legend>
      {children}
    </fieldset>
  );
}

/** What the campaign still needs, from the server. */
function ProblemList({ problems }: { problems: string[] }) {
  const { t } = useSponsorTranslation();
  if (problems.length === 0) return null;
  return (
    <Notice tone="warning" title={t('editor.problemsHeading')}>
      <ul className="m-0 pl-5">
        {problems.map((code) => (
          <li key={code}>{t(problemKeyOf(code), { code })}</li>
        ))}
      </ul>
    </Notice>
  );
}

/** The note above the buttons for a campaign in review, approved or sent back. */
function StateNote({ campaign }: { campaign: StaffCampaign | null }) {
  const { t } = useSponsorTranslation();
  if (campaign === null) return null;
  if (campaign.state === 'in_review')
    return <Notice tone="info">{t('editor.inReviewNote')}</Notice>;
  if (campaign.state === 'approved') return <Notice tone="info">{t('editor.approvedNote')}</Notice>;
  if (campaign.state === 'sent_back' && campaign.review_note !== '') {
    return (
      <Notice tone="warning">{t('editor.sentBackNote', { note: campaign.review_note })}</Notice>
    );
  }
  return null;
}

/**
 * The values to save: a credit's category or contest defaults to the first one offered, as the
 * drop-down shows it.
 */
function valuesToSave(fields: CampaignFields, props: CampaignFormProps): CampaignFields {
  return {
    ...fields,
    category_slug:
      fields.category_slug === '' ? (props.categorySlugs[0] ?? '') : fields.category_slug,
    contest_id: fields.contest_id === '' ? (props.contests[0]?.id ?? '') : fields.contest_id,
  };
}

/**
 * Renders the form.
 *
 * @returns the campaign form
 */
export function CampaignForm(props: CampaignFormProps) {
  const { campaign, sponsors, contests, categorySlugs, onCreated } = props;
  const { t } = useSponsorTranslation();
  const changes = useSponsorChanges();
  const [fields, setFields] = useState<CampaignFields>(() =>
    campaign === null ? emptyCampaignFields(sponsors[0]?.id ?? '') : fieldsOfCampaign(campaign),
  );
  const set: SetCampaignField = (field, value) =>
    setFields((before) => ({ ...before, [field]: value }));
  // Step 1: save as a draft; a new campaign then opens at its own address.
  const save = (event: FormEvent) => {
    event.preventDefault();
    const fieldsToSave = valuesToSave(fields, props);
    void changes
      .change({ kind: 'save_campaign', campaignId: campaign?.id ?? null, fields: fieldsToSave })
      .then((saved) => {
        if (campaign === null && saved !== null) onCreated(saved.id);
      })
      .catch(errorShownByHook);
  };
  // Step 2: send the saved campaign for review.
  const submit = () => {
    if (campaign === null) return;
    void changes.change({ kind: 'submit', campaignId: campaign.id }).catch(errorShownByHook);
  };
  const successText =
    changes.lastChange?.kind === 'submit' ? t('editor.submitted') : t('editor.saved');
  const maySubmit =
    campaign !== null && (campaign.state === 'draft' || campaign.state === 'sent_back');
  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <FieldGroup title={t('editor.basics')}>
        <CampaignBasicsFields
          fields={fields}
          set={set}
          choices={{ sponsors, contests, categorySlugs }}
        />
      </FieldGroup>
      <FieldGroup title={t('editor.targeting')}>
        <CampaignTargetingFields fields={fields} set={set} categorySlugs={categorySlugs} />
      </FieldGroup>
      <FieldGroup title={t('editor.creative')}>
        <CampaignCreativeUpload campaign={campaign} />
        <CampaignWordsFields fields={fields} set={set} />
        <CampaignLinkAndDatesFields fields={fields} set={set} />
      </FieldGroup>
      {campaign !== null && <ProblemList problems={campaign.problems} />}
      <StateNote campaign={campaign} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="secondary" disabled={changes.isRunning}>
          {t('editor.save')}
        </Button>
        {maySubmit && (
          <Button disabled={changes.isRunning} onClick={submit}>
            {t('editor.submit')}
          </Button>
        )}
      </div>
      <ChangeOutcome successText={successText} isDone={changes.isDone} failure={changes.failure} />
    </form>
  );
}
