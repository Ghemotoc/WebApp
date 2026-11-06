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
 * With "Copied from a published work" it asks where the text came from, all optional, and attaches
 * the passage the reader selected before pressing Report (S1-E10-08). For a private message it
 * says that the message and up to 20 before it go with the report (S1-E9-02).
 * Signed out, it says to log in: reporting needs an account (the web form is S1-E10-02).
 * Above the form, "Is someone in danger right now?" shows the helplines for the reader's country
 * (S1-E10-13a), because a report is never the right tool for an emergency.
 * Who shows it: ReportButton. What it calls: useReportItem → api/reports.ts → report_item().
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { SafetyContactsBlock } from '@/features/safety/components/SafetyContactsBlock';
import {
  copiedWorkReason,
  copySourceForDatabase,
  emptyCopySource,
  findReportProblem,
  reportDetailsMaxLength,
  type CopySource,
  type ReportReason,
} from '@/schemas/report';

import type { ReportableType } from '../api/reports';
import { useReportItem } from '../hooks/useReportItem';

import { CopySourceFields } from './CopySourceFields';
import { ReportReasonList } from './ReportReasonList';
import { ReportSent } from './ReportSent';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the dialog needs. */
export interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: ReportableType;
  itemReference: string;
  /** How the item is named to the reporter, for example "@inkwolf" or a story's title. */
  itemLabel: string;
  /** The text the reader had selected when they pressed Report (S1-E10-08), if any. */
  selectedPassage?: string | null;
}

/**
 * "Anything else? (optional)", with its "too long" error.
 *
 * @returns the field and its error
 */
function DetailsField(props: {
  details: string;
  onChange: (details: string) => void;
  isTooLong: boolean;
}) {
  const { t } = useTranslation('reporting');
  return (
    <>
      <Textarea
        id="report-details"
        label={t('dialog.details')}
        hint={t('dialog.detailsHint', { max: reportDetailsMaxLength })}
        aria-invalid={props.isTooLong ? true : undefined}
        rows={3}
        value={props.details}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.isTooLong && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t('dialog.detailsTooLong')}
        </p>
      )}
    </>
  );
}

/**
 * Cancel and Send report.
 *
 * @returns the button row
 */
function FormButtons(props: { onCancel: () => void; isSending: boolean }) {
  const { t } = useTranslation('reporting');
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <Button variant="secondary" onClick={props.onCancel}>
        {t('dialog.cancel')}
      </Button>
      <Button type="submit" disabled={props.isSending}>
        {t(props.isSending ? 'dialog.sending' : 'dialog.send')}
      </Button>
    </div>
  );
}

/**
 * The lines under the details: for a private message, what goes to the team with it (S1-E9-02;
 * board Messages 5.5), then that a person reads every report.
 *
 * @returns one or two lines
 */
function ReassuranceLines({ itemType }: { itemType: ReportableType }) {
  const { t } = useTranslation('reporting');
  return (
    <>
      {itemType === 'message' && (
        <p className="m-0 text-sm text-body">{t('dialog.messageContext')}</p>
      )}
      <p className="m-0 text-sm text-body">{t('dialog.aPersonReads')}</p>
    </>
  );
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
  // "Copied from a published work" (S1-E10-08): the source, and the passage selected on the page.
  const [copySource, setCopySource] = useState<CopySource>(emptyCopySource);
  const [passage, setPassage] = useState(props.selectedPassage ?? null);

  /** Checks the answers, then sends. A refusal is shown from useReportItem. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = findReportProblem({ reason, details });
    setProblem(found);
    if (found !== null || reason === null) return;
    const copyDetails = {
      ...copySourceForDatabase(copySource),
      ...(passage === null ? {} : { reportedPassage: passage }),
    };
    await props.report
      .send({
        itemType: props.itemType,
        itemReference: props.itemReference,
        reason,
        details,
        copyDetails,
      })
      .catch(errorShownByHook);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <ReportReasonList
        chosen={reason}
        onChoose={setReason}
        errorMessage={problem === 'reason_missing' ? t('dialog.reasonMissing') : undefined}
      />
      {reason === copiedWorkReason && (
        <CopySourceFields
          idPrefix="report"
          source={copySource}
          onChange={(change) => setCopySource((current) => ({ ...current, ...change }))}
          selectedPassage={passage}
          onRemovePassage={() => setPassage(null)}
        />
      )}
      <DetailsField
        details={details}
        onChange={setDetails}
        isTooLong={problem === 'details_too_long'}
      />
      <ReassuranceLines itemType={props.itemType} />
      {props.report.failure !== null && (
        <Notice tone="error">{t(`failures.${props.report.failure}`)}</Notice>
      )}
      <FormButtons onCancel={props.onClose} isSending={props.report.isSending} />
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
              <p className="m-0 eyebrow">{t('dialog.eyebrow')}</p>
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
          {/* "Is someone in danger right now?": the reader's country's helplines (S1-E10-13a). */}
          {report.receipt === null && <SafetyContactsBlock />}
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
