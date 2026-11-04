/**
 * HouseAdForm: add or change one of our own house ads (story S1-E12-05 criterion 6; board
 * AdminSponsors "House ads").
 *
 * A house ad has a title in Română and English, an optional line in each, a page on our own site
 * (a path starting with /; the server refuses anything else), the slot it shows in (or any slot)
 * and its dates. The Romanian and English fields sit side by side from 768 px, each marked with
 * its language (WCAG 3.1.2).
 * Who shows it: HouseAdsSection. What it calls: usePlacementChanges() and ChangeOutcome.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import type { HouseAd, HouseAdFields, PlacementSlot } from '@/schemas/adPlacements';

import { usePlacementChanges } from '../../../hooks/usePlacements';
import { houseAdFieldsOf, romanianToday } from '../../../lib/placementWords';
import { useSponsorTranslation } from '../../../registerSponsorTranslations';
import { ChangeOutcome } from '../ChangeOutcome';

/** What every field group gets. */
interface GroupProps {
  fields: HouseAdFields;
  setFields: (fields: HouseAdFields) => void;
}

/** Both titles and both lines, side by side from 768 px. */
function HouseAdWordsFields({ fields, setFields }: GroupProps) {
  const { t } = useSponsorTranslation();
  const pairs = [
    { key: 'title_ro', label: 'houseAds.titleRo', lang: 'ro', longest: 80 },
    { key: 'title_en', label: 'houseAds.titleEn', lang: 'en', longest: 80 },
    { key: 'text_ro', label: 'houseAds.textRo', lang: 'ro', longest: 140 },
    { key: 'text_en', label: 'houseAds.textEn', lang: 'en', longest: 140 },
  ] as const;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {pairs.map((pair) => (
        <TextInput
          key={pair.key}
          id={`house-ad-${pair.key}`}
          label={t(pair.label)}
          lang={pair.lang}
          maxLength={pair.longest}
          value={fields[pair.key]}
          onChange={(event) => setFields({ ...fields, [pair.key]: event.target.value })}
        />
      ))}
    </div>
  );
}

/** The page it leads to, the slot and the dates. */
function HouseAdWhereFields({ fields, setFields, slots }: GroupProps & { slots: PlacementSlot[] }) {
  const { t } = useSponsorTranslation();
  const slotOptions = [
    { value: '', label: t('houseAds.anySlot') },
    ...slots.map((slot) => ({
      value: slot.slot_key,
      label: t(`inventory.slots.${slot.slot_key}`),
    })),
  ];
  return (
    <>
      <TextInput
        id="house-ad-link"
        label={t('houseAds.link')}
        hint={t('houseAds.linkHint')}
        maxLength={200}
        value={fields.link_path}
        onChange={(event) => setFields({ ...fields, link_path: event.target.value })}
      />
      <Select
        id="house-ad-slot"
        label={t('houseAds.slot')}
        placement="form"
        isLabelVisible
        options={slotOptions}
        value={fields.slot_key}
        onChange={(slotKey) => setFields({ ...fields, slot_key: slotKey })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          id="house-ad-from"
          type="date"
          label={t('houseAds.from')}
          value={fields.starts_on}
          onChange={(event) => setFields({ ...fields, starts_on: event.target.value })}
        />
        <TextInput
          id="house-ad-to"
          type="date"
          label={t('houseAds.to')}
          value={fields.ends_on}
          onChange={(event) => setFields({ ...fields, ends_on: event.target.value })}
        />
      </div>
    </>
  );
}

/** What the form needs. */
interface HouseAdFormProps {
  /** The house ad to change, or null for a new one. */
  houseAd: HouseAd | null;
  slots: PlacementSlot[];
  onClose: () => void;
}

/**
 * Renders the form.
 *
 * @returns the house ad form
 */
export function HouseAdForm({ houseAd, slots, onClose }: HouseAdFormProps) {
  const { t } = useSponsorTranslation();
  const changes = usePlacementChanges();
  const [fields, setFields] = useState(() => houseAdFieldsOf(houseAd, romanianToday()));
  // Saving sends every field; the server refuses a missing title or a link to another site.
  const save = (event: FormEvent) => {
    event.preventDefault();
    void changes
      .change({ kind: 'save_house', houseAdId: houseAd?.id ?? null, fields })
      .catch(() => undefined);
  };
  return (
    <form
      onSubmit={save}
      aria-label={t(houseAd === null ? 'houseAds.new' : 'houseAds.edit')}
      className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5"
    >
      <HouseAdWordsFields fields={fields} setFields={setFields} />
      <HouseAdWhereFields fields={fields} setFields={setFields} slots={slots} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={changes.isRunning}>
          {t('houseAds.save')}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t('houseAds.cancelEdit')}
        </Button>
      </div>
      <ChangeOutcome
        successText={t('houseAds.saved')}
        isDone={changes.isDone}
        failure={changes.failure}
      />
    </form>
  );
}
