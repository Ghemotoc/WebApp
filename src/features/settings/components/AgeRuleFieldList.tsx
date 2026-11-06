/**
 * AgeRuleFieldList: the age rule editor's fields, from the place to the reason (bundle MARKETS-1,
 * story S1-E2-21, criterion 2).
 *
 * The country and region codes are shown only for a new rule; an existing rule keeps its place.
 * A blank "blocked below" age means sign-up is never blocked. The reason goes to the audit log.
 * Who uses it: AgeRuleEditor, which holds the values and saves them.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';

import type { EditorFields } from '../lib/ageRuleFields';

/** What the fields need. */
interface AgeRuleFieldListProps {
  fields: EditorFields;
  isNew: boolean;
  onChange: (field: keyof EditorFields, value: string) => void;
}

/** The choices of the two drop-downs, as stored in the database. */
const confidenceValues = ['high', 'medium', 'low'];
const statusValues = ['to_verify', 'verified'];

/**
 * Renders the fields.
 *
 * @returns the fields, one under the other
 */
export function AgeRuleFieldList({ fields, isNew, onChange }: AgeRuleFieldListProps) {
  const { t } = useTranslation('settings');
  // The shared props of a text field: its id, its label and its value as typed.
  const text = (field: keyof EditorFields, type = 'text') => ({
    id: `age-rule-${field}`,
    label: t(`ageRules.fields.${field}`),
    type,
    value: fields[field],
    onChange: (event: { target: { value: string } }) => onChange(field, event.target.value),
  });
  // The shared props of a drop-down: its id, its visible label, its value and its choices.
  const choice = (field: 'confidence' | 'status', values: string[], labels: string) => ({
    id: `age-rule-${field}`,
    label: t(`ageRules.fields.${field}`),
    isLabelVisible: true,
    value: fields[field],
    onChange: (value: string) => onChange(field, value),
    options: values.map((value) => ({ value, label: t(`ageRules.${labels}.${value}`) })),
  });

  return (
    <>
      {isNew && <TextInput {...text('countryCode')} hint={t('ageRules.hints.countryCode')} />}
      {isNew && <TextInput {...text('regionCode')} hint={t('ageRules.hints.regionCode')} />}
      <TextInput {...text('name')} />
      <TextInput {...text('regionName')} />
      <TextInput {...text('minimumAge', 'number')} />
      <TextInput {...text('parentalConsentBelow', 'number')} />
      <TextInput {...text('signupBlockedBelow', 'number')} hint={t('ageRules.hints.blocked')} />
      <TextInput {...text('legalBasis')} />
      <TextInput {...text('source')} />
      <TextInput {...text('dateChecked', 'date')} />
      <Select {...choice('confidence', confidenceValues, 'confidences')} />
      <Select {...choice('status', statusValues, 'statuses')} />
      <Textarea {...text('notes')} rows={3} />
      <TextInput {...text('reason')} hint={t('ageRules.hints.reason')} />
    </>
  );
}
