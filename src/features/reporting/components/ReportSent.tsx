/**
 * ReportSent: the confirmation inside the Report dialog (story S1-E10-01; DSA art. 16(4):
 * confirmation of receipt).
 *
 * Board (ReportDialog, "Report sent"): a tick, "Report sent", "Thanks. A person on our team will
 * read it and tell you what we decide.", the reference to quote, and a way back. "See my reports"
 * waits for its screen (board 6.5, S1-E10-04); the in-app copy in notifications waits for
 * S1-E7-01, so the dialog says "we've sent you a confirmation" only once that exists.
 * Who shows it: ReportDialog, after a successful send.
 */
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { Button } from '@/components/ui/Button';

import type { ReportReceipt } from '../api/reports';

/**
 * Renders the confirmation.
 *
 * @param props.receipt - the reference and time from the database
 * @param props.onClose - closes the dialog
 * @returns the confirmation panel
 */
export function ReportSent({ receipt, onClose }: { receipt: ReportReceipt; onClose: () => void }) {
  const { t, i18n } = useTranslation('reporting');
  const receivedAt = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(receipt.receivedAt));
  return (
    <div role="status" className="flex flex-col gap-4">
      <p className="m-0 inline-flex items-center gap-2 font-heading text-[22px] font-bold text-heading">
        <CheckIcon />
        {t('sent.heading')}
      </p>
      <p className="m-0 text-body">{t('sent.body')}</p>
      <p className="m-0 text-sm text-meta">
        {t('sent.reference', { reference: receipt.reference, receivedAt })}
      </p>
      <div>
        <Button variant="secondary" onClick={onClose}>
          {t('sent.back')}
        </Button>
      </div>
    </div>
  );
}
