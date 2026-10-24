/**
 * ReportDialog: the one report form, opened by ReportButton on any reportable item (story
 * S1-E10-01; the public web form, S1-E10-02, reuses it with the item left empty).
 *
 * Board (ReportDialog): "Report this <kind>", what is reported and "They won't see who reported
 * it", the reasons, "Anything else? (optional)", the "a person reads every report" line, Cancel
 * and Send report; after sending, the confirmation; a corner "×" named "Close" / "Închide" (CTO,
 * 24 Oct 2026). No doodles on reporting screens (DoD).
 * How it is a dialog: the browser's own <dialog> element with showModal(), which traps focus,
 * closes on Escape and gives focus back to the button that opened it (WCAG 2.2, 2.1.2 and 2.4.3).
 * Signed out, it says to log in: reporting needs an account (the web form is S1-E10-02).
 * Who shows it: ReportButton. What it calls: useReportItem → api/reports.ts → report_item().
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { findReportProblem, reportDetailsMaxLength, type ReportReason } from '@/schemas/report';

import type { ReportableType } from '../api/reports';
import { useReportItem } from '../hooks/useReportItem';

import { ReportReasonList } from './ReportReasonList';
import { ReportSent } from './ReportSent';

/** What the dialog needs. */
export interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: ReportableType;
  itemReference: string;
  /** How the item is named to the reporter, for example "@inkwolf" or a story's title. */
  itemLabel: string;
}

/**
 * The form: reasons, details, the reassurance line, Cancel and Send.
 *
 * @returns the form
 */
function ReportForm(props: ReportDialogProps & { report: ReturnType<typeof useReportItem> }) {
  const { t } = useTranslation('reporting');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [problem, setProblem] = useState<ReturnType<typeof findReportProblem>>(null);

  /** Checks the answers, then sends. A refusal is shown from useReportItem. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = findReportProblem({ reason, details });
    setProblem(found);
    if (found !== null || reason === null) return;
    await props.report
      .send({ itemType: props.itemType, itemReference: props.itemReference, reason, details })
      .catch(() => undefined);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <ReportReasonList
        chosen={reason}
        onChoose={setReason}
        errorMessage={problem === 'reason_missing' ? t('dialog.reasonMissing') : undefined}
      />
      <Textarea
        id="report-details"
        label={t('dialog.details')}
        hint={t('dialog.detailsHint', { max: reportDetailsMaxLength })}
        aria-invalid={problem === 'details_too_long' ? true : undefined}
        rows={3}
        value={details}
        onChange={(event) => setDetails(event.target.value)}
      />
      {problem === 'details_too_long' && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t('dialog.detailsTooLong')}
        </p>
      )}
      <p className="m-0 text-sm text-body">{t('dialog.aPersonReads')}</p>
      {props.report.failure !== null && (
        <Notice tone="error">{t(`failures.${props.report.failure}`)}</Notice>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={props.onClose}>
          {t('dialog.cancel')}
        </Button>
        <Button type="submit" disabled={props.report.isSending}>
          {t(props.report.isSending ? 'dialog.sending' : 'dialog.send')}
        </Button>
      </div>
    </form>
  );
}

/**
 * The corner "×" from the board (ReportDialog, CTO 24 Oct 2026): a 44 px round button whose
 * accessible name is "Close" / "Închide". Closing the native dialog fires its close event, so it
 * goes through the same path as Escape. The × is a close icon, which the doodle rule exempts.
 *
 * @param props.label - the accessible name, in the page's language
 * @param props.onClick - closes the dialog
 * @returns the button
 */
function CloseButton(props: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      className="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-body hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the <dialog>, open or closed as asked
 */
export function ReportDialog(props: ReportDialogProps) {
  const { t } = useTranslation('reporting');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const report = useReportItem();

  // Step 1: open and close the native dialog as the prop changes; forget the last send on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (props.isOpen && !dialog.open) dialog.showModal();
    if (!props.isOpen && dialog.open) dialog.close();
  }, [props.isOpen]);

  /** Escape or a close call: tell the parent, and start fresh next time. */
  function handleClose() {
    report.reset();
    props.onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      aria-labelledby="report-dialog-title"
      className="m-auto w-[min(100%-32px,640px)] rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] text-ink shadow-card backdrop:bg-ink/50"
    >
      {props.isOpen && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="m-0 font-eyebrow text-sm text-eyebrow">{t('dialog.eyebrow')}</p>
              <h2
                id="report-dialog-title"
                className="m-0 font-heading text-[26px] font-bold text-heading"
              >
                {t(`dialog.title.${props.itemType}`)}
              </h2>
              <p className="m-0 text-body">{t('dialog.anonymous', { item: props.itemLabel })}</p>
            </div>
            <CloseButton label={t('dialog.close')} onClick={() => dialogRef.current?.close()} />
          </div>
          {report.receipt !== null && <ReportSent receipt={report.receipt} onClose={handleClose} />}
          {report.receipt === null && report.isSessionKnown && !report.isSignedIn && (
            <p className="m-0 text-body">
              {t('dialog.signedOut')}{' '}
              <Link to="/sign-in" className="font-semibold text-link underline">
                {t('dialog.logIn')}
              </Link>
            </p>
          )}
          {report.receipt === null && report.isSignedIn && (
            <ReportForm {...props} onClose={handleClose} report={report} />
          )}
        </div>
      )}
    </dialog>
  );
}
