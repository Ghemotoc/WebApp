/**
 * ConvertToReportForm: "Convert to report" on a support ticket: the address of what is reported
 * (optional), the reason and what the ticket says, sent to the moderation team as a notice linked
 * to the ticket (story S1-E11-13, part 13b; bundle ADMIN-2h4b; criterion 10). The reason sets the
 * case's tier, and a child's safety goes to staff with the safeguarding permission (S1-E10-10).
 *
 * Who shows it: TicketLinksPanel. What it calls: the convert mutation of useTicketLinks.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';

import { ticketReportReasons, type ReportDraft, type ReportReason } from '../api/ticketLinks';
import type { useTicketLinks } from '../hooks/useTicketLinks';
import { useSupportTranslation } from '../registerSupportTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** An empty form; a worry about a minor is the first reason, because it matters most. */
const emptyDraft: ReportDraft = { address: '', reason: 'threat_to_minor', explanation: '' };

/**
 * What happened after the last try: the notice's reference, or why it was refused.
 *
 * @returns the live region
 */
function ConvertResult({ state }: { state: ReturnType<typeof useTicketLinks> }) {
  const { t } = useSupportTranslation();
  const result = state.convert.data;
  return (
    <div aria-live="polite">
      {state.convertFailure !== null && (
        <Notice tone="error">{t(`staff.links.convertFailures.${state.convertFailure}`)}</Notice>
      )}
      {result !== undefined && state.convertFailure === null && (
        <Notice tone="success">
          {t(result.matched ? 'staff.links.convertedToCase' : 'staff.links.convertedUnmatched', {
            reference: result.reference,
          })}
        </Notice>
      )}
    </div>
  );
}

/**
 * Renders the form; it empties once the notice is made.
 *
 * @returns the form
 */
export function ConvertToReportForm({ state }: { state: ReturnType<typeof useTicketLinks> }) {
  const { t } = useSupportTranslation();
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const isReady = draft.explanation.trim() !== '';

  /** Sends the notice; the form empties once it is saved. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isReady) return;
    void state.convert
      .mutateAsync(draft)
      .then(() => setDraft(emptyDraft))
      .catch(errorShownByHook);
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={submit}>
      <h3 className="m-0 font-heading text-base font-bold text-heading">
        {t('staff.links.convertHeading')}
      </h3>
      <TextInput
        id="support-report-address"
        label={t('staff.links.address')}
        hint={t('staff.links.addressHint')}
        value={draft.address}
        onChange={(event) => setDraft({ ...draft, address: event.target.value })}
      />
      <Select
        id="support-report-reason"
        label={t('staff.links.reason')}
        isLabelVisible
        value={draft.reason}
        onChange={(value) => setDraft({ ...draft, reason: value as ReportReason })}
        options={ticketReportReasons.map((reason) => ({
          value: reason,
          label: t(`staff.links.reasons.${reason}`),
        }))}
      />
      <Textarea
        id="support-report-explanation"
        label={t('staff.links.explanation')}
        rows={4}
        maxLength={2000}
        value={draft.explanation}
        onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
      />
      <Button
        type="submit"
        variant="secondary"
        className="w-fit"
        disabled={state.convert.isPending || !isReady}
      >
        {t('staff.links.convert')}
      </Button>
      <ConvertResult state={state} />
    </form>
  );
}
