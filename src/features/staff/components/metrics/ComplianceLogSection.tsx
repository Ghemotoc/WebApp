/**
 * ComplianceLogSection: the compliance log, the ANCOM launch task and the transparency note on the
 * staff Metrics page (story S1-E11-04, criterion 2 and its legal note; board AdminMetrics).
 *
 * "Log a request" opens the form; "Record the action" on an open entry opens a one-field form;
 * "Export DSA log (CSV)" downloads every row (the database logs the export). Owner and admin only:
 * the database refuses everyone else (admin_compliance_log()).
 * Who shows it: MarchNumbersPage. What it calls: useComplianceLog → api/complianceLog.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { ComplianceLogFailure, NewComplianceEntry } from '../../api/complianceLog';
import { useComplianceLog } from '../../hooks/useComplianceLog';

import { CompleteEntryForm } from './CompleteEntryForm';
import { ComplianceEntryForm } from './ComplianceEntryForm';
import { ComplianceLogTable } from './ComplianceLogTable';
import { LaunchTaskCard } from './LaunchTaskCard';
import { MetricsCard } from './MetricsCard';

/**
 * The page's state for the two forms, and what to do when each is saved.
 *
 * @param compliance - the hook's answer
 * @returns which form is open and the handlers
 */
function useForms(compliance: ReturnType<typeof useComplianceLog>) {
  const [isAdding, setIsAdding] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  return {
    isAdding,
    completing,
    openAdd: () => {
      setCompleting(null);
      setIsAdding(true);
    },
    closeAdd: () => setIsAdding(false),
    openComplete: (reference: string) => {
      setIsAdding(false);
      setCompleting(reference);
    },
    closeComplete: () => setCompleting(null),
    // Each form closes only once the database has saved it, so a refusal stays on screen.
    saveNew: async (entry: NewComplianceEntry) => {
      await compliance.add(entry);
      setIsAdding(false);
    },
    saveAction: async (reference: string, action: string) => {
      await compliance.complete(reference, action);
      setCompleting(null);
    },
  };
}

/**
 * Whichever form is open: "Log a request" or "Record the action".
 *
 * @param props.compliance - the hook's answer
 * @param props.forms - which form is open and its handlers
 * @returns the open form, or nothing
 */
function OpenForm({
  compliance,
  forms,
}: {
  compliance: ReturnType<typeof useComplianceLog>;
  forms: ReturnType<typeof useForms>;
}) {
  const { t } = useTranslation('staff');
  const problem = (failure: ComplianceLogFailure | null) =>
    failure === null ? null : t(`metrics.compliance.problems.${failure}`);
  return (
    <>
      {forms.isAdding && (
        <ComplianceEntryForm
          isSaving={compliance.isAdding}
          saveProblem={problem(compliance.addFailure)}
          onSave={forms.saveNew}
          onCancel={forms.closeAdd}
        />
      )}
      {forms.completing !== null && (
        <CompleteEntryForm
          reference={forms.completing}
          isSaving={compliance.isCompleting}
          saveProblem={problem(compliance.completeFailure)}
          onSave={(action) => forms.saveAction(forms.completing ?? '', action)}
          onCancel={forms.closeComplete}
        />
      )}
    </>
  );
}

/**
 * Renders the section.
 *
 * @returns the log card and the launch task cards
 */
export function ComplianceLogSection() {
  const { t } = useTranslation('staff');
  const compliance = useComplianceLog();
  const forms = useForms(compliance);
  const problem = (failure: ComplianceLogFailure | null) =>
    failure === null ? null : t(`metrics.compliance.problems.${failure}`);
  if (compliance.loadFailure !== null) {
    return <Notice tone="error">{problem(compliance.loadFailure)}</Notice>;
  }
  if (compliance.log === null) return <p className="m-0 text-meta">{t('metrics.loading')}</p>;
  const actions = (
    <>
      <Button variant="secondary" disabled={compliance.isExporting} onClick={compliance.exportCsv}>
        {t(compliance.isExporting ? 'metrics.compliance.exporting' : 'metrics.compliance.export')}
      </Button>
      <Button onClick={forms.openAdd}>{t('metrics.compliance.logRequest')}</Button>
    </>
  );
  return (
    <>
      <MetricsCard
        headingId="metrics-compliance"
        eyebrow={t('metrics.compliance.eyebrow')}
        heading={t('metrics.compliance.heading')}
        intro={t('metrics.compliance.intro')}
        actions={actions}
      >
        {compliance.exportFailure !== null && (
          <Notice tone="error">{t('metrics.compliance.exportFailed')}</Notice>
        )}
        {compliance.addedReference !== null && !forms.isAdding && (
          <Notice tone="success">
            {t('metrics.compliance.saved', { reference: compliance.addedReference })}
          </Notice>
        )}
        <OpenForm compliance={compliance} forms={forms} />
        <ComplianceLogTable entries={compliance.log.entries} onComplete={forms.openComplete} />
      </MetricsCard>
      <LaunchTaskCard
        launch={compliance.log.launch}
        isSaving={compliance.isSavingLaunchDate}
        hasSaveFailed={compliance.launchFailure !== null}
        onSaveDate={compliance.saveLaunchDate}
      />
    </>
  );
}
