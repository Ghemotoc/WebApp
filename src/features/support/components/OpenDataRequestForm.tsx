/**
 * OpenDataRequestForm: "Open data request" on a support ticket: what the person asks for, then a
 * data request in Staff › Data requests, received on the day the ticket arrived so the legal
 * month counts from then (story S1-E11-13, part 13b; bundle ADMIN-2h4b; criterion 11; GDPR art.
 * 12(3)). A ticket from someone without an account says to handle it by email instead.
 *
 * Who shows it: TicketLinksPanel. What it calls: the openRequest mutation of useTicketLinks.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import { dataRequestTypes, type DataRequestType } from '../api/ticketLinks';
import type { useTicketLinks } from '../hooks/useTicketLinks';
import { useSupportTranslation } from '../registerSupportTranslations';

/**
 * Renders the form, or one line when the person has no account.
 *
 * @returns the form
 */
export function OpenDataRequestForm({
  state,
  hasAccount,
}: {
  state: ReturnType<typeof useTicketLinks>;
  hasAccount: boolean;
}) {
  const { t } = useSupportTranslation();
  const [requestType, setRequestType] = useState<DataRequestType>('copy');
  if (!hasAccount) return <p className="m-0 text-sm text-body">{t('staff.links.noAccount')}</p>;

  /** Opens the request. */
  function submit(event: FormEvent) {
    event.preventDefault();
    state.openRequest.mutate(requestType);
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={submit}>
      <h3 className="m-0 font-heading text-base font-bold text-heading">
        {t('staff.links.requestHeading')}
      </h3>
      <Select
        id="support-data-request-type"
        label={t('staff.links.requestType')}
        isLabelVisible
        value={requestType}
        onChange={(value) => setRequestType(value as DataRequestType)}
        options={dataRequestTypes.map((type) => ({
          value: type,
          label: t(`staff.links.requestTypes.${type}`),
        }))}
      />
      <Button
        type="submit"
        variant="secondary"
        className="w-fit"
        disabled={state.openRequest.isPending}
      >
        {t('staff.links.openRequest')}
      </Button>
      <div aria-live="polite">
        {state.requestFailure !== null && (
          <Notice tone="error">{t(`staff.links.requestFailures.${state.requestFailure}`)}</Notice>
        )}
      </div>
    </form>
  );
}
