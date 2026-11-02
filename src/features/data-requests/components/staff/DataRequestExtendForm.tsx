/**
 * DataRequestExtendForm: gives an open request one or two more months, with a reason the person
 * reads (bundle ADMIN-2, part c1; story S1-E11-09 criterion 3; GDPR art. 12(3): at most two
 * further months, and the person is told within the first month, with the reasons).
 *
 * Who shows it: StaffDataRequestPage. What it calls: onExtend(), which useStaffDataRequest sends
 * to admin_extend_data_request(); the database checks the first month again and tells the person.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { romaniaNowFields } from '@/lib/romania-time';

import type { DataRequest } from '../../api/dataRequests';
import { extensionChoices } from '../../lib/dataRequestDates';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestSection } from './DataRequestSection';

/** What the form needs. */
interface DataRequestExtendFormProps {
  request: DataRequest;
  isActing: boolean;
  onExtend: (extraMonths: 1 | 2, reason: string) => Promise<unknown>;
}

/**
 * The fields: the months (the first choice left) and the reason, emptied after a save.
 *
 * @param choices - the months still allowed
 * @param onExtend - sends the extension
 * @returns the fields, their setters and submit()
 */
function useExtendFields(choices: Array<1 | 2>, onExtend: DataRequestExtendFormProps['onExtend']) {
  const [wantedMonths, setWantedMonths] = useState<1 | 2 | null>(null);
  const [reason, setReason] = useState('');
  const months =
    wantedMonths !== null && choices.includes(wantedMonths) ? wantedMonths : choices[0];
  return {
    months,
    reason,
    setMonths: (value: string) => setWantedMonths(value === '2' ? 2 : 1),
    setReason,
    submit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (months === undefined) return;
      onExtend(months, reason)
        .then(() => setReason(''))
        // The failure is shown on the page from the hook.
        .catch(() => undefined);
    },
  };
}

/**
 * Renders the form, or why the deadline can't move.
 *
 * @returns the panel
 */
export function DataRequestExtendForm({ request, isActing, onExtend }: DataRequestExtendFormProps) {
  const { t } = useDataRequestsTranslation();
  const choices = extensionChoices(request.dueOn, request.extendedTo);
  const fields = useExtendFields(choices, onExtend);
  const isFirstMonthOver = romaniaNowFields(new Date()).date > request.dueOn;
  if (isFirstMonthOver || fields.months === undefined) {
    return (
      <DataRequestSection id="data-request-extend" heading={t('page.extendHeading')}>
        <p className="m-0 text-body">
          {isFirstMonthOver ? t('page.extendTooLate') : t('page.extendedFully')}
        </p>
      </DataRequestSection>
    );
  }
  return (
    <DataRequestSection id="data-request-extend" heading={t('page.extendHeading')}>
      <p className="m-0 text-body">{t('page.extendHint')}</p>
      <form className="flex flex-col gap-4" onSubmit={fields.submit}>
        <Select
          id="data-request-months"
          label={t('page.months')}
          isLabelVisible
          placement="form"
          value={String(fields.months)}
          onChange={fields.setMonths}
          options={choices.map((months) => ({
            value: String(months),
            label: months === 1 ? t('page.oneMonth') : t('page.twoMonths'),
          }))}
        />
        <Textarea
          id="data-request-extend-reason"
          label={t('page.extendReason')}
          value={fields.reason}
          maxLength={1000}
          onChange={(event) => fields.setReason(event.target.value)}
        />
        <Button type="submit" variant="secondary" className="self-start" disabled={isActing}>
          {t('page.extend')}
        </Button>
      </form>
    </DataRequestSection>
  );
}
