/**
 * The campaign form's field groups: the campaign, where it shows, the creative's words, the link
 * and the dates (story S1-E12-02 criterion 1; board AdminSponsors "Set up a campaign").
 *
 * Romanian and English fields sit side by side from 768 px and one under the other on a phone,
 * each marked with its language (WCAG 3.1.2). Targeting offers only the page's category, tags
 * and language; the "Not available, ever" list says what is never used.
 * Who shows them: CampaignForm. What they call: nothing; the form keeps the values.
 */
import { useState } from 'react';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { CheckboxGroup } from '@/features/contests/components/staff/CheckboxGroup';
import { sponsorPlacements, type CampaignFields } from '@/schemas/sponsors';

import type { SponsorableContest, Sponsor } from '../../api/sponsors';
import { tagsFromText } from '../../lib/campaignFields';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

/** How a group changes the form's values. */
export type SetCampaignField = <Field extends keyof CampaignFields>(
  field: Field,
  value: CampaignFields[Field],
) => void;

/** What every group gets. */
interface GroupProps {
  fields: CampaignFields;
  set: SetCampaignField;
}

/** The choices the campaign group offers. */
interface BasicsChoices {
  sponsors: Sponsor[];
  contests: SponsorableContest[];
  categorySlugs: string[];
}

/** For a "Sponsored by" credit: the category or the contest it sponsors. */
function CampaignCreditField({ fields, set, choices }: GroupProps & { choices: BasicsChoices }) {
  const { t, i18n } = useSponsorTranslation();
  return (
    <>
      {fields.placement === 'category' && (
        <Select
          id="campaign-category"
          label={t('editor.category')}
          placement="form"
          isLabelVisible
          options={choices.categorySlugs.map((slug) => ({
            value: slug,
            label: t(`categories.${slug}`, { ns: 'writing' }),
          }))}
          value={
            fields.category_slug === '' ? (choices.categorySlugs[0] ?? '') : fields.category_slug
          }
          onChange={(value) => set('category_slug', value)}
        />
      )}
      {fields.placement === 'contest' && (
        <Select
          id="campaign-contest"
          label={t('editor.contest')}
          placement="form"
          isLabelVisible
          options={choices.contests.map((contest) => ({
            value: contest.id,
            label: i18n.language === 'ro' ? contest.nameRo : contest.nameEn,
          }))}
          value={fields.contest_id === '' ? (choices.contests[0]?.id ?? '') : fields.contest_id}
          onChange={(value) => set('contest_id', value)}
        />
      )}
    </>
  );
}

/** Sponsor, name, placement and, for a credit, the category or contest. */
export function CampaignBasicsFields({
  fields,
  set,
  choices,
}: GroupProps & { choices: BasicsChoices }) {
  const { t } = useSponsorTranslation();
  return (
    <div className="flex flex-col gap-4">
      <Select
        id="campaign-sponsor"
        label={t('editor.sponsor')}
        placement="form"
        isLabelVisible
        options={choices.sponsors.map((sponsor) => ({ value: sponsor.id, label: sponsor.name }))}
        value={fields.sponsor_id}
        onChange={(value) => set('sponsor_id', value)}
      />
      <TextInput
        id="campaign-name"
        label={t('editor.name')}
        maxLength={100}
        value={fields.name}
        onChange={(event) => set('name', event.target.value)}
      />
      <Select
        id="campaign-placement"
        label={t('editor.placement')}
        placement="form"
        isLabelVisible
        options={sponsorPlacements.map((placement) => ({
          value: placement,
          label: t(`placements.${placement}`),
        }))}
        value={fields.placement}
        onChange={(value) => set('placement', value as CampaignFields['placement'])}
      />
      <CampaignCreditField fields={fields} set={set} choices={choices} />
    </div>
  );
}

/** The six things never used to choose an ad. */
const neverUsed = ['age', 'gender', 'history', 'interests', 'location', 'device'] as const;

/** Category, tags and language of the pages it shows on, and what is never used. */
export function CampaignTargetingFields({
  fields,
  set,
  categorySlugs,
}: GroupProps & { categorySlugs: string[] }) {
  const { t } = useSponsorTranslation();
  // The tags field keeps what staff type; the values keep the tags.
  const [tagsText, setTagsText] = useState(fields.target_tags.join(', '));
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-meta">{t('editor.targetingHint')}</p>
      <CheckboxGroup
        legend={t('editor.targetCategories')}
        choices={categorySlugs.map((slug) => ({
          value: slug,
          label: t(`categories.${slug}`, { ns: 'writing' }),
        }))}
        chosen={fields.target_categories}
        onChange={(chosen) => set('target_categories', chosen)}
      />
      <TextInput
        id="campaign-tags"
        label={t('editor.targetTags')}
        value={tagsText}
        onChange={(event) => {
          setTagsText(event.target.value);
          set('target_tags', tagsFromText(event.target.value));
        }}
      />
      <CheckboxGroup
        legend={t('editor.targetLanguages')}
        choices={['ro', 'en'].map((code) => ({
          value: code,
          label: t(`languages.${code}`, { ns: 'writing' }),
          lang: code,
        }))}
        chosen={fields.target_languages}
        onChange={(chosen) => set('target_languages', chosen)}
      />
      <div className="flex flex-col gap-1 rounded-2xl border border-hairline p-4">
        <h3 className="m-0 text-sm font-semibold text-heading">{t('editor.neverHeading')}</h3>
        <ul className="m-0 flex flex-wrap gap-x-4 pl-5 text-sm text-body">
          {neverUsed.map((key) => (
            <li key={key}>{t(`editor.never.${key}`)}</li>
          ))}
        </ul>
        <p className="m-0 text-sm text-meta">{t('editor.neverNote')}</p>
      </div>
    </div>
  );
}

/** The alt text and the line of text, in both languages, with their counters. */
export function CampaignWordsFields({ fields, set }: GroupProps) {
  const { t } = useSponsorTranslation();
  const pairs = [
    { key: 'alt_ro', label: 'editor.altRo', lang: 'ro', longest: 200 },
    { key: 'alt_en', label: 'editor.altEn', lang: 'en', longest: 200 },
    { key: 'text_ro', label: 'editor.textRo', lang: 'ro', longest: 140 },
    { key: 'text_en', label: 'editor.textEn', lang: 'en', longest: 140 },
  ] as const;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {pairs.map((pair) => (
        <TextInput
          key={pair.key}
          id={`campaign-${pair.key}`}
          label={t(pair.label)}
          lang={pair.lang}
          maxLength={pair.longest}
          hint={t('editor.counter', { used: fields[pair.key].length, longest: pair.longest })}
          value={fields[pair.key]}
          onChange={(event) => set(pair.key, event.target.value)}
        />
      ))}
    </div>
  );
}

/** The link, the discount code and the dates. */
export function CampaignLinkAndDatesFields({ fields, set }: GroupProps) {
  const { t } = useSponsorTranslation();
  return (
    <div className="flex flex-col gap-4">
      <TextInput
        id="campaign-link"
        type="url"
        label={t('editor.link')}
        hint={t('editor.linkHint')}
        maxLength={500}
        value={fields.link_url}
        onChange={(event) => set('link_url', event.target.value)}
      />
      <TextInput
        id="campaign-code"
        label={t('editor.discountCode')}
        hint={t('editor.discountHint')}
        maxLength={40}
        value={fields.discount_code}
        onChange={(event) => set('discount_code', event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          id="campaign-starts"
          type="date"
          label={t('editor.startsOn')}
          value={fields.starts_on}
          onChange={(event) => set('starts_on', event.target.value)}
        />
        <TextInput
          id="campaign-ends"
          type="date"
          label={t('editor.endsOn')}
          value={fields.ends_on}
          onChange={(event) => set('ends_on', event.target.value)}
        />
      </div>
      <p className="m-0 text-[13px] text-meta">{t('editor.datesHint')}</p>
    </div>
  );
}
