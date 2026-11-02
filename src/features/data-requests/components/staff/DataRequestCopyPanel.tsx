/**
 * DataRequestCopyPanel: "The copy" on a data request's page: why it can't be sent yet, or the
 * choice and the button; then the files waiting for the person and every copy sent (bundle
 * ADMIN-2, part c2; story S1-E11-09; GDPR art. 15 and 20; ADR 0012).
 *
 * Who shows it: StaffDataRequestPage, for a request for a copy or to move the data. What it calls:
 * useDataRequestCopy (build, send, open a file) and the three parts beside it.
 */
import { Notice } from '@/components/ui/Notice';

import type { DataRequestDetail } from '../../api/dataRequests';
import { useDataRequestCopy } from '../../hooks/useDataRequestCopy';
import { copyBlockedReason } from '../../lib/dataRequestCopyRules';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestCopiesSent } from './DataRequestCopiesSent';
import { DataRequestCopyForm } from './DataRequestCopyForm';
import { DataRequestFiles } from './DataRequestFiles';
import { DataRequestSection } from './DataRequestSection';

/**
 * Renders the panel.
 *
 * @returns the section
 */
export function DataRequestCopyPanel({ request }: { request: DataRequestDetail }) {
  const { t } = useDataRequestsTranslation();
  const copy = useDataRequestCopy(request);
  const blocked = copyBlockedReason(request);
  const failure = copy.sendFailure ?? copy.openFailure;
  return (
    <DataRequestSection id="data-request-copy" heading={t('copy.heading')}>
      <p className="m-0 text-body">{t('copy.intro')}</p>
      {blocked !== null && blocked !== 'closed' && (
        <p className="m-0 text-body">{t(`copy.blocked.${blocked}`)}</p>
      )}
      {failure !== null && <Notice tone="error">{t(`failures.${failure}`)}</Notice>}
      {copy.hasSent && !copy.isSending && <Notice tone="success">{t('copy.sent')}</Notice>}
      {blocked === null && <DataRequestCopyForm isSending={copy.isSending} onSend={copy.send} />}
      <DataRequestFiles files={request.files} onOpen={copy.openFile} />
      <DataRequestCopiesSent copies={request.copiesSent} />
    </DataRequestSection>
  );
}
