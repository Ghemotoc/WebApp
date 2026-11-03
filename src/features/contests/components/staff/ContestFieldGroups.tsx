/**
 * The contest editor's field groups: the bilingual words, the dates and who can enter (story
 * S1-E11-15 criterion 1; bundle CONTESTS-13b1).
 *
 * The Romanian and English fields sit side by side from 768 px and one under the other on a
 * phone, each marked with its language (WCAG 3.1.2). Character counts come from the same limits
 * the database checks (src/schemas/contests.ts).
 * Who shows them: ContestForm. What they call: nothing; the form keeps the values.
 */
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { languageNameOf } from '@/features/settings/lib/marketNames';
import { contestAgeGroups, type ContestDetails } from '@/schemas/contests';

import type { ContestChoices } from '../../api/contests';
import { countryNameOf } from '../../lib/contestWords';
import { useContestTranslation } from '../../registerContestTranslations';

import { CheckboxGroup } from './CheckboxGroup';

/** How a group changes the form's values. */
type SetField = <Field extends keyof ContestDetails>(
  field: Field,
  value: ContestDetails[Field],
) => void;

/** The fields that come in a Romanian and an English version. */
type BilingualField = 'name' | 'what_counts' | 'prize';

/** What a bilingual pair needs. */
interface BilingualFieldsProps {
  field: BilingualField;
  details: ContestDetails;
  set: SetField;
  longest: number;
  isMultiline: boolean;
}

/**
 * Renders one field in Română and in English.
 *
 * @returns the pair
 */
export function BilingualFields({
  field,
  details,
  set,
  longest,
  isMultiline,
}: BilingualFieldsProps) {
  const { t } = useContestTranslation();
  const romanianKey = `${field}_ro` as const;
  const englishKey = `${field}_en` as const;
  const pairs = [
    { key: romanianKey, language: 'ro' },
    { key: englishKey, language: 'en' },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {pairs.map(({ key, language }) => {
        const common = {
          id: `contest-${key}`,
          label: t(`staff.editor.fields.${key}`),
          hint: t('staff.editor.counter', { used: details[key].length, longest }),
          lang: language,
          maxLength: longest,
          value: details[key],
        };
        return isMultiline ? (
          <Textarea
            key={key}
            {...common}
            rows={3}
            onChange={(event) => set(key, event.target.value)}
          />
        ) : (
          <TextInput key={key} {...common} onChange={(event) => set(key, event.target.value)} />
        );
      })}
    </div>
  );
}

/** The three dates. */
export function ContestDatesFields({ details, set }: { details: ContestDetails; set: SetField }) {
  const { t } = useContestTranslation();
  const dates = ['entries_open_on', 'entries_close_on', 'results_on'] as const;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-3">
        {dates.map((key) => (
          <TextInput
            key={key}
            id={`contest-${key}`}
            type="date"
            label={t(`staff.editor.fields.${key}`)}
            value={details[key] ?? ''}
            onChange={(event) => set(key, event.target.value === '' ? null : event.target.value)}
          />
        ))}
      </div>
      <p className="m-0 text-[13px] text-meta">{t('staff.editor.fields.datesHint')}</p>
    </div>
  );
}

/** Age groups, markets and story languages. */
export function ContestWhoFields(props: {
  details: ContestDetails;
  set: SetField;
  choices: ContestChoices;
}) {
  const { details, set, choices } = props;
  const { t, i18n } = useContestTranslation();
  return (
    <div className="flex flex-col gap-3">
      <CheckboxGroup
        legend={t('staff.editor.fields.age_groups')}
        choices={contestAgeGroups.map((group) => ({
          value: group,
          label: t(`staff.editor.ageGroups.${group}`),
        }))}
        chosen={details.age_groups}
        onChange={(chosen) =>
          set(
            'age_groups',
            contestAgeGroups.filter((group) => chosen.includes(group)),
          )
        }
      />
      <CheckboxGroup
        legend={t('staff.editor.fields.markets')}
        choices={choices.marketCodes.map((code) => ({
          value: code,
          label: countryNameOf(code, i18n.language),
        }))}
        chosen={details.market_codes}
        onChange={(chosen) => set('market_codes', chosen)}
      />
      <CheckboxGroup
        legend={t('staff.editor.fields.languages')}
        choices={choices.languageCodes.map((code) => ({
          value: code,
          label: languageNameOf(code, i18n.language),
        }))}
        chosen={details.language_codes}
        onChange={(chosen) => set('language_codes', chosen)}
      />
    </div>
  );
}
