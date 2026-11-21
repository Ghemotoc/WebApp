/**
 * BugReportPanel: the "Report a bug" panel the tab opens (TRIAL-FEEDBACK; boards J31 and J32).
 *
 * Who uses it: BugReportTab, which loads this file only the first time someone presses the tab.
 * What it calls: Sheet (the glass panel: beside the page on computers, from the bottom on
 * phones), BugReportForm, and hooks/useBugReport.ts.
 * After sending, the panel says thank you, with Close (board J32). Closing a sent report clears
 * the form for the next one; Cancel or Escape keeps what was written, in case it was a slip.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

import { useBugReport } from '../hooks/useBugReport';
import { useTrialTranslation } from '../registerTrialTranslations';
import { BugReportForm } from './BugReportForm';

/** What the panel needs from the tab. */
export interface BugReportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The panel.
 *
 * @returns the sheet with the form, or with the thank-you line once sent
 */
export function BugReportPanel({ isOpen, onClose }: BugReportPanelProps) {
  const { t, i18n } = useTrialTranslation();
  const report = useBugReport(i18n.language);
  // A new number gives the next report an empty form.
  const [formNumber, setFormNumber] = useState(0);

  /** Closes the panel; a report that was sent makes way for a fresh form. */
  function close() {
    if (report.isSent) {
      report.reset();
      setFormNumber((number) => number + 1);
    }
    onClose();
  }

  return (
    <Sheet isOpen={isOpen} onClose={close} title={t('bugReport.title')}>
      {report.isSent ? (
        <div className="flex flex-col items-start gap-4">
          <p role="status" className="m-0 type-body text-body">
            {t('bugReport.sentBody')}
          </p>
          <Button variant="secondary" onClick={close}>
            {t('bugReport.close')}
          </Button>
        </div>
      ) : (
        <BugReportForm
          key={formNumber}
          isSending={report.isSending}
          hasFailed={report.hasFailed}
          onSend={report.send}
          onCancel={onClose}
        />
      )}
    </Sheet>
  );
}
