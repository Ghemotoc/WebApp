/**
 * DataRequestCloseForm: closes an open request with what was done (bundle ADMIN-2, part c1; story
 * S1-E11-09 criterion "a request is closed"). The outcome stays in the log as our proof (GDPR art.
 * 5(2)); the person doesn't read it.
 *
 * Who shows it: StaffDataRequestPage. What it calls: onClose(), which useStaffDataRequest sends to
 * admin_close_data_request().
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestSection } from './DataRequestSection';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
interface DataRequestCloseFormProps {
  isActing: boolean;
  onClose: (outcome: string) => Promise<unknown>;
}

/**
 * Renders the form.
 *
 * @returns the panel
 */
export function DataRequestCloseForm({ isActing, onClose }: DataRequestCloseFormProps) {
  const { t } = useDataRequestsTranslation();
  const [outcome, setOutcome] = useState('');

  /** Sends the outcome; a refusal is shown on the page from the hook. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onClose(outcome).catch(errorShownByHook);
  }

  return (
    <DataRequestSection id="data-request-close" heading={t('page.closeHeading')}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Textarea
          id="data-request-outcome"
          label={t('page.outcome')}
          hint={t('page.closeHint')}
          value={outcome}
          maxLength={2000}
          onChange={(event) => setOutcome(event.target.value)}
        />
        <Button type="submit" className="self-start" disabled={isActing}>
          {t('page.close')}
        </Button>
      </form>
    </DataRequestSection>
  );
}
