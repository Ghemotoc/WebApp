/**
 * DataRequestIdentityPanel: the identity check of one open request (bundle ADMIN-2, part c1; story
 * S1-E11-09 criterion 4; GDPR art. 12(6)): where it stands, and "Ask them to confirm" for a request
 * that came by email or post. The person answers signed in to their own account, in Settings ›
 * Data requests; nothing is ever sent to an address taken from the request.
 *
 * Who shows it: StaffDataRequestPage. What it calls: onAsk(), which useStaffDataRequest sends to
 * admin_ask_data_request_confirmation(). An under-16's check goes to the parent (part c2), so the
 * button isn't offered for them.
 */
import { Button } from '@/components/ui/Button';

import type { DataRequest } from '../../api/dataRequests';
import { useDataRequestWords } from '../../hooks/useDataRequestWords';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestSection } from './DataRequestSection';

/** What the panel needs. */
interface DataRequestIdentityPanelProps {
  request: DataRequest;
  isActing: boolean;
  onAsk: () => void;
}

/**
 * The explanation under the heading, by where the check stands.
 *
 * @returns the key of the explanation
 */
function explanationKey(request: DataRequest): string {
  if (request.identity === 'not_asked') return 'page.identityExplainAsk';
  if (request.identity === 'asked') return 'page.identityExplainAsked';
  return 'page.identityExplainDone';
}

/**
 * Renders the panel.
 *
 * @returns the panel
 */
export function DataRequestIdentityPanel({
  request,
  isActing,
  onAsk,
}: DataRequestIdentityPanelProps) {
  const { t } = useDataRequestsTranslation();
  const words = useDataRequestWords();
  const mayAsk =
    !request.isUnder16 && (request.identity === 'not_asked' || request.identity === 'asked');
  return (
    <DataRequestSection id="data-request-identity" heading={t('page.identityHeading')}>
      <p className="m-0 font-semibold text-ink">{words.identity(request)}</p>
      {request.identity !== 'not_needed' && (
        <p className="m-0 text-body">{t(explanationKey(request))}</p>
      )}
      {mayAsk && (
        <Button variant="secondary" className="self-start" disabled={isActing} onClick={onAsk}>
          {request.identity === 'asked' ? t('page.askAgain') : t('page.ask')}
        </Button>
      )}
    </DataRequestSection>
  );
}
