/**
 * BookSlotForm: "Book a slot for a campaign" (story S1-E12-05 criterion 2; board AdminSponsors
 * "Book a slot").
 *
 * Staff pick an approved campaign, a slot, the first and last day and the pages it should match
 * (category, tags, language; nothing ticked means any page), then "Check and book". The server
 * checks for a clash under a lock and refuses one with the booking already in the slot, which
 * ChangeOutcome shows. The days are date fields rather than the board's week pickers, because a
 * booking must sit inside the campaign's own dates, which needn't start on a Monday (noted in the
 * pull request).
 * Who shows it: PlacementsSection. What it calls: usePlacementChanges() and ChangeOutcome.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { CheckboxGroup } from '@/features/contests/components/staff/CheckboxGroup';
import type { BookingFields, PlacementSlot } from '@/schemas/adPlacements';
import type { StaffCampaign } from '@/schemas/sponsors';

import { useCampaignDatesInWords } from '../../../hooks/useCampaignDatesInWords';
import { usePlacementChanges } from '../../../hooks/usePlacements';
import { tagsFromText } from '../../../lib/campaignFields';
import { emptyBookingFields, romanianToday } from '../../../lib/placementWords';
import { useSponsorTranslation } from '../../../registerSponsorTranslations';
import { ChangeOutcome } from '../ChangeOutcome';

/** What the form needs from the section. */
interface BookSlotFormProps {
  /** The approved campaigns that can be booked. */
  campaigns: StaffCampaign[];
  slots: PlacementSlot[];
  categorySlugs: string[];
}

/** The category, tag and language rows: the pages the booking matches. */
function BookingPagesFields({
  fields,
  setFields,
  categorySlugs,
}: {
  fields: BookingFields;
  setFields: (fields: BookingFields) => void;
  categorySlugs: string[];
}) {
  const { t } = useSponsorTranslation();
  // The tags field keeps what staff type; the values keep the tags.
  const [tagsText, setTagsText] = useState('');
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-2 p-0">
        <Eyebrow>{t('booking.pagesHeading')}</Eyebrow>
      </legend>
      <CheckboxGroup
        legend={t('booking.categories')}
        choices={categorySlugs.map((slug) => ({
          value: slug,
          label: t(`categories.${slug}`, { ns: 'writing' }),
        }))}
        chosen={fields.categories}
        onChange={(chosen) => setFields({ ...fields, categories: chosen })}
      />
      <TextInput
        id="booking-tags"
        label={t('booking.tags')}
        value={tagsText}
        onChange={(event) => {
          setTagsText(event.target.value);
          setFields({ ...fields, tags: tagsFromText(event.target.value) });
        }}
      />
      <CheckboxGroup
        legend={t('booking.languages')}
        choices={['ro', 'en'].map((code) => ({
          value: code,
          label: t(`languages.${code}`, { ns: 'writing' }),
          lang: code,
        }))}
        chosen={fields.languages}
        onChange={(chosen) => setFields({ ...fields, languages: chosen })}
      />
      <p className="m-0 text-[13px] text-meta">{t('booking.anyNote')}</p>
    </fieldset>
  );
}

/** The campaign and slot pickers, and the campaign's own dates under them. */
function BookingWhatFields({
  campaignId,
  onCampaign,
  fields,
  setFields,
  props,
}: {
  campaignId: string;
  onCampaign: (campaignId: string) => void;
  fields: BookingFields;
  setFields: (fields: BookingFields) => void;
  props: BookSlotFormProps;
}) {
  const { t } = useSponsorTranslation();
  const datesInWords = useCampaignDatesInWords();
  const campaign = props.campaigns.find((candidate) => candidate.id === campaignId);
  return (
    <>
      <Select
        id="booking-campaign"
        label={t('booking.campaign')}
        placement="form"
        isLabelVisible
        options={props.campaigns.map((candidate) => ({
          value: candidate.id,
          label: `${candidate.name} · ${candidate.sponsor_name}`,
        }))}
        value={campaignId}
        onChange={onCampaign}
      />
      {campaign !== undefined && (
        <p className="m-0 text-[13px] text-meta">
          {t('booking.campaignDates', { dates: datesInWords(campaign) })}
        </p>
      )}
      <Select
        id="booking-slot"
        label={t('booking.slot')}
        placement="form"
        isLabelVisible
        options={props.slots.map((slot) => ({
          value: slot.slot_key,
          label: t(`inventory.slots.${slot.slot_key}`),
        }))}
        value={fields.slot_key}
        onChange={(slotKey) => setFields({ ...fields, slot_key: slotKey })}
      />
    </>
  );
}

/** The first and last day. */
function BookingDaysFields({
  fields,
  setFields,
}: {
  fields: BookingFields;
  setFields: (fields: BookingFields) => void;
}) {
  const { t } = useSponsorTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput
        id="booking-from"
        type="date"
        label={t('booking.from')}
        value={fields.starts_on}
        onChange={(event) => setFields({ ...fields, starts_on: event.target.value })}
      />
      <TextInput
        id="booking-to"
        type="date"
        label={t('booking.to')}
        value={fields.ends_on}
        onChange={(event) => setFields({ ...fields, ends_on: event.target.value })}
      />
    </div>
  );
}

/** The eyebrow and the form's heading, which names the form. */
function BookingHeading() {
  const { t } = useSponsorTranslation();
  return (
    <div className="flex flex-col gap-1">
      <Eyebrow>{t('booking.eyebrow')}</Eyebrow>
      <h3 id="booking-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('booking.heading')}
      </h3>
    </div>
  );
}

/**
 * Renders the form, or a line saying no campaign can be booked yet.
 *
 * @returns the booking form
 */
export function BookSlotForm(props: BookSlotFormProps) {
  const { t } = useSponsorTranslation();
  const changes = usePlacementChanges();
  const today = romanianToday();
  const firstSlotKey = props.slots[0]?.slot_key ?? '';
  // Step 1: the form starts on the first bookable campaign, with its own dates.
  const [campaignId, setCampaignId] = useState(props.campaigns[0]?.id ?? '');
  const [fields, setFields] = useState(() =>
    emptyBookingFields(props.campaigns[0], firstSlotKey, today),
  );
  // Step 2: picking another campaign takes its dates, keeping the slot.
  const pickCampaign = (nextId: string) => {
    setCampaignId(nextId);
    const next = props.campaigns.find((campaign) => campaign.id === nextId);
    setFields({ ...emptyBookingFields(next, fields.slot_key, today), slot_key: fields.slot_key });
  };
  // Step 3: "Check and book" sends it; the server refuses a clash and says with what.
  const book = (event: FormEvent) => {
    event.preventDefault();
    void changes.change({ kind: 'book', campaignId, fields }).catch(() => undefined);
  };
  return (
    <form
      onSubmit={book}
      aria-labelledby="booking-heading"
      className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-6"
    >
      <BookingHeading />
      {props.campaigns.length === 0 ? (
        <p className="m-0 text-body">{t('booking.noCampaigns')}</p>
      ) : (
        <>
          <BookingWhatFields
            campaignId={campaignId}
            onCampaign={pickCampaign}
            fields={fields}
            setFields={setFields}
            props={props}
          />
          <BookingDaysFields fields={fields} setFields={setFields} />
          <BookingPagesFields
            fields={fields}
            setFields={setFields}
            categorySlugs={props.categorySlugs}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={changes.isRunning}>
              {t('booking.submit')}
            </Button>
            <span className="text-[13px] text-meta">{t('booking.rule')}</span>
          </div>
          <ChangeOutcome
            successText={t('booking.done')}
            isDone={changes.isDone}
            failure={changes.failure}
          />
        </>
      )}
    </form>
  );
}
