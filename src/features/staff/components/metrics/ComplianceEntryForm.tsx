/**
 * ComplianceEntryForm: "Log a request" on the staff Metrics page (story S1-E11-04, criterion 2;
 * board AdminMetrics).
 *
 * Fields: what it is (an authority order, a legal request or the ANCOM launch notice), the
 * authority, when it arrived (Romania time), what was asked and, when it is already dealt with,
 * the action taken and when. lib/complianceEntryForm.ts checks the fields; the database checks
 * them again. Who shows it: ComplianceLogSection. What it calls: the onSave it is given.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { romaniaNowFields } from '@/lib/romania-time';

import type { ComplianceEntryKind, NewComplianceEntry } from '../../api/complianceLog';
import {
  complianceEntryFrom,
  emptyComplianceForm,
  type ComplianceFormValues,
} from '../../lib/complianceEntryForm';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The kinds, in the order the drop-down lists them. */
const kinds: ComplianceEntryKind[] = ['legal_request', 'authority_order', 'launch_notice'];

/** What the field groups need. */
interface FieldsProps {
  values: ComplianceFormValues;
  onChange: (values: ComplianceFormValues) => void;
}

/**
 * A date and a time field side by side.
 *
 * @param props.prefix - the fields' id prefix and the keys they edit ("received" or "done")
 * @returns the two fields
 */
function DateAndTime({ values, onChange, prefix }: FieldsProps & { prefix: 'received' | 'done' }) {
  const { t } = useTranslation('staff');
  const dateKey = prefix === 'received' ? 'receivedDate' : 'doneDate';
  const timeKey = prefix === 'received' ? 'receivedTime' : 'doneTime';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextInput
        id={`compliance-${prefix}-date`}
        type="date"
        label={t(`metrics.compliance.form.${prefix}Date`)}
        value={values[dateKey]}
        onChange={(event) => onChange({ ...values, [dateKey]: event.target.value })}
      />
      <TextInput
        id={`compliance-${prefix}-time`}
        type="time"
        label={t('metrics.compliance.form.time')}
        value={values[timeKey]}
        onChange={(event) => onChange({ ...values, [timeKey]: event.target.value })}
      />
    </div>
  );
}

/**
 * What it is, who sent it, when and what they asked.
 *
 * @returns the fields
 */
function RequestFields({ values, onChange }: FieldsProps) {
  const { t } = useTranslation('staff');
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Select
          id="compliance-kind"
          label={t('metrics.compliance.form.kind')}
          isLabelVisible
          options={kinds.map((kind) => ({
            value: kind,
            label: t(`metrics.compliance.kinds.${kind}`),
          }))}
          value={values.kind}
          onChange={(kind) =>
            onChange({ ...values, kind: kinds.find((known) => known === kind) ?? values.kind })
          }
        />
      </div>
      <TextInput
        id="compliance-authority"
        maxLength={200}
        label={t('metrics.compliance.form.authority')}
        hint={t('metrics.compliance.form.authorityHint')}
        value={values.authority}
        onChange={(event) => onChange({ ...values, authority: event.target.value })}
      />
      <DateAndTime values={values} onChange={onChange} prefix="received" />
      <Textarea
        id="compliance-content"
        maxLength={2000}
        label={t('metrics.compliance.form.content')}
        hint={t('metrics.compliance.form.contentHint')}
        value={values.content}
        onChange={(event) => onChange({ ...values, content: event.target.value })}
      />
    </>
  );
}

/**
 * "Already done", and the action and its time when it is.
 *
 * @returns the fields
 */
function DoneFields({ values, onChange }: FieldsProps) {
  const { t } = useTranslation('staff');
  return (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="size-5"
          checked={values.isDone}
          onChange={(event) => onChange({ ...values, isDone: event.target.checked })}
        />
        {t('metrics.compliance.form.isDone')}
      </label>
      {values.isDone && (
        <>
          <Textarea
            id="compliance-action"
            maxLength={2000}
            label={t('metrics.compliance.form.action')}
            value={values.actionTaken}
            onChange={(event) => onChange({ ...values, actionTaken: event.target.value })}
          />
          <DateAndTime values={values} onChange={onChange} prefix="done" />
        </>
      )}
    </>
  );
}

/** What the form needs. */
interface ComplianceEntryFormProps {
  isSaving: boolean;
  /** A plain reason from the database's refusal, already translated, or null. */
  saveProblem: string | null;
  onSave: (entry: NewComplianceEntry) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function ComplianceEntryForm({
  isSaving,
  saveProblem,
  onSave,
  onCancel,
}: ComplianceEntryFormProps) {
  const { t } = useTranslation('staff');
  const [values, setValues] = useState(() => emptyComplianceForm(romaniaNowFields(new Date())));
  const [problem, setProblem] = useState<string | null>(null);

  /** Checks the fields in plain words, then hands the entry to the section. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const entry = complianceEntryFrom(values);
    if (typeof entry === 'string') return setProblem(t(`metrics.compliance.problems.${entry}`));
    setProblem(null);
    // A refusal arrives as saveProblem from the section; nothing else to do here.
    await onSave(entry).catch(errorShownByHook);
  }

  const shownProblem = problem ?? saveProblem;
  return (
    <form
      noValidate
      aria-label={t('metrics.compliance.form.label')}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-card border border-border bg-tint p-5"
    >
      <RequestFields values={values} onChange={setValues} />
      <DoneFields values={values} onChange={setValues} />
      {shownProblem !== null && <Notice tone="error">{shownProblem}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSaving}>
          {t(isSaving ? 'metrics.compliance.form.saving' : 'metrics.compliance.form.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('metrics.compliance.form.cancel')}
        </Button>
      </div>
    </form>
  );
}
