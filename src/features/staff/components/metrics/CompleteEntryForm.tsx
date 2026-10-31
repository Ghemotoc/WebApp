/**
 * CompleteEntryForm: "Record the action" for an open compliance log entry (story S1-E11-04,
 * criterion 2).
 *
 * One field, the action taken; it is saved as done now. A done entry is proof and can't be
 * changed afterwards (admin_complete_compliance_entry()). Who shows it: ComplianceLogSection.
 * What it calls: the onSave it is given.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

/** What the form needs. */
interface CompleteEntryFormProps {
  reference: string;
  isSaving: boolean;
  /** A plain reason from the database's refusal, already translated, or null. */
  saveProblem: string | null;
  onSave: (action: string) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function CompleteEntryForm({
  reference,
  isSaving,
  saveProblem,
  onSave,
  onCancel,
}: CompleteEntryFormProps) {
  const { t } = useTranslation('staff');
  const [action, setAction] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  /** Asks for the action in plain words, then hands it to the section. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (action.trim() === '') return setProblem(t('metrics.compliance.problems.empty'));
    setProblem(null);
    await onSave(action.trim()).catch(() => undefined);
  }

  const shownProblem = problem ?? saveProblem;
  return (
    <form
      noValidate
      aria-label={t('metrics.compliance.complete.label', { reference })}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-card border border-border bg-tint p-5"
    >
      <Textarea
        id="compliance-complete-action"
        maxLength={2000}
        label={t('metrics.compliance.complete.label', { reference })}
        hint={t('metrics.compliance.complete.hint')}
        value={action}
        onChange={(event) => setAction(event.target.value)}
      />
      {shownProblem !== null && <Notice tone="error">{shownProblem}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSaving}>
          {t(isSaving ? 'metrics.compliance.form.saving' : 'metrics.compliance.complete.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('metrics.compliance.form.cancel')}
        </Button>
      </div>
    </form>
  );
}
