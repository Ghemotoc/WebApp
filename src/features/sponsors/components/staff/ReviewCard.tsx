/**
 * ReviewCard: one campaign waiting for review, with its creative, the four checks, a note,
 * Approve and Send back (story S1-E12-02 criterion 2; board AdminSponsors "Check the creative").
 *
 * The reviewer sees the picture (the uploader and moderation staff may read it at every stage),
 * the alt text, the line of text in both languages, the link and any discount code. Approve is
 * refused by the server until every check is ticked and a moderator has approved the picture;
 * Send back needs a note. Who shows it: ReviewQueue, which sends the decision and shows its
 * outcome above the queue (an approved card leaves the queue at once). What it calls: nothing.
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { reviewChecks, type ReviewCheck, type StaffCampaign } from '@/schemas/sponsors';

import type { CampaignReview } from '../../api/sponsors';
import { useCampaignDatesInWords } from '../../hooks/useCampaignDatesInWords';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { CampaignPicture } from './CampaignPicture';

/** The creative's words in both languages, the link and the code, as label and value rows. */
function CreativeDetails({ campaign }: { campaign: StaffCampaign }) {
  const { t } = useSponsorTranslation();
  const rows = [
    { key: 'text-ro', label: t('review.textLabel'), value: campaign.text_ro, lang: 'ro' },
    { key: 'text-en', label: t('review.textLabel'), value: campaign.text_en, lang: 'en' },
    { key: 'alt-ro', label: t('review.altLabel'), value: campaign.alt_ro, lang: 'ro' },
    { key: 'alt-en', label: t('review.altLabel'), value: campaign.alt_en, lang: 'en' },
    { key: 'link', label: t('review.linkLabel'), value: campaign.link_url, lang: undefined },
    { key: 'code', label: t('review.codeLabel'), value: campaign.discount_code, lang: undefined },
  ].filter((row) => row.value !== '');
  return (
    <dl className="m-0 flex flex-col text-sm">
      {rows.map((row) => (
        <div key={row.key} className="flex gap-3 border-b border-hairline py-2 last:border-b-0">
          <dt className="w-32 shrink-0 text-meta">
            {row.label}
            {row.lang !== undefined && ` (${row.lang})`}
          </dt>
          <dd className="m-0 break-words text-ink" lang={row.lang}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The four checks as tick boxes. */
function ReviewChecks(props: { ticked: ReviewCheck[]; onChange: (ticked: ReviewCheck[]) => void }) {
  const { t } = useSponsorTranslation();
  const toggle = (check: ReviewCheck) =>
    props.onChange(
      props.ticked.includes(check)
        ? props.ticked.filter((other) => other !== check)
        : [...props.ticked, check],
    );
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="mb-1 text-sm font-semibold text-ink">{t('review.checksLegend')}</legend>
      {reviewChecks.map((check) => (
        <label key={check} className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="h-5 w-5 shrink-0"
            checked={props.ticked.includes(check)}
            onChange={() => toggle(check)}
          />
          <span>{t(`review.checks.${check}`)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** What a card needs. */
interface ReviewCardProps {
  campaign: StaffCampaign;
  onDecide: (review: CampaignReview) => void;
  isRunning: boolean;
}

/**
 * Renders one campaign's review.
 *
 * @returns the card
 */
export function ReviewCard({ campaign, onDecide, isRunning }: ReviewCardProps) {
  const { t } = useSponsorTranslation();
  const noteId = useId();
  const datesInWords = useCampaignDatesInWords();
  const [ticked, setTicked] = useState<ReviewCheck[]>([]);
  const [note, setNote] = useState('');
  // The decision goes to the queue, which sends it; the server checks everything again.
  const decide = (decision: CampaignReview['decision']) =>
    onDecide({ campaignId: campaign.id, decision, checks: ticked, note });
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-hairline p-4">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-heading text-lg font-bold text-heading">{campaign.name}</h3>
        <p className="m-0 text-sm text-meta">
          {t('review.summary', {
            sponsor: campaign.sponsor_name,
            placement: t(`placements.${campaign.placement}`),
            dates: datesInWords(campaign),
          })}
        </p>
      </div>
      <CampaignPicture campaign={campaign} />
      <CreativeDetails campaign={campaign} />
      <ReviewChecks ticked={ticked} onChange={setTicked} />
      <Textarea
        id={`review-note-${noteId}`}
        label={t('review.note')}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button disabled={isRunning} onClick={() => decide('approve')}>
          {t('review.approve')}
        </Button>
        <Button variant="secondary" disabled={isRunning} onClick={() => decide('send_back')}>
          {t('review.sendBack')}
        </Button>
      </div>
    </li>
  );
}
