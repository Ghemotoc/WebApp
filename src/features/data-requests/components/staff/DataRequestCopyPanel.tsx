/**
 * DataRequestCopyPanel: "The copy" on a data request's page: why it can't be sent yet, or the
 * choice and the button; then the files waiting for the person and every copy sent (bundle
 * ADMIN-2, part c2; story S1-E11-09; GDPR art. 15 and 20; ADR 0012).
 *
 * Who shows it: StaffDataRequestPage, for a request for a copy or to move the data. What it calls:
 * useDataRequestCopy (build, send, open a file, resend the parent's link) and the parts beside it.
 * On the parent's path (part c3) the files go to the parent by a one-time link, not to the person.
 */
import { Notice } from '@/components/ui/Notice';

import type { DataRequestDetail } from '../../api/dataRequests';
import { useDataRequestCopy } from '../../hooks/useDataRequestCopy';
import { copyBlockedReason, type CopyBlockedReason } from '../../lib/dataRequestCopyRules';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestCopiesSent } from './DataRequestCopiesSent';
import { DataRequestCopyForm } from './DataRequestCopyForm';
import { DataRequestFiles } from './DataRequestFiles';
import { DataRequestParentLink } from './DataRequestParentLink';
import { DataRequestSection } from './DataRequestSection';

/**
 * Why the copy can't go yet, in the words of the path: the person's, or their parent's (part c3).
 *
 * @returns the key of the explanation
 */
function blockedKey(request: DataRequestDetail, blocked: CopyBlockedReason): string {
  const isParentsAnswer = blocked === 'identity_denied' || blocked === 'identity_not_checked';
  if (request.goesToParent && isParentsAnswer) return `copy.blockedParent.${blocked}`;
  return `copy.blocked.${blocked}`;
}

/** What the panel's words need. */
interface CopyNoticesProps {
  request: DataRequestDetail;
  copy: ReturnType<typeof useDataRequestCopy>;
  blocked: CopyBlockedReason | null;
}

/**
 * The first thing that failed: sending the copy, sending the parent's link again, or opening a
 * file.
 *
 * @returns the failure, or null
 */
function firstFailure(copy: ReturnType<typeof useDataRequestCopy>) {
  return copy.sendFailure ?? copy.resendFailure ?? copy.openFailure;
}

/**
 * The panel's words: what the copy holds and where it goes, why it can't go yet, what failed and
 * what was sent, each in the words of the path (the person's, or their parent's, part c3).
 *
 * @returns the words
 */
function CopyNotices({ request, copy, blocked }: CopyNoticesProps) {
  const { t } = useDataRequestsTranslation();
  const failure = firstFailure(copy);
  const hasSent = (copy.hasSent || copy.hasResent) && !copy.isSending;
  return (
    <>
      <p className="m-0 text-body">{t(request.goesToParent ? 'copy.introParent' : 'copy.intro')}</p>
      {blocked !== null && blocked !== 'closed' && (
        <p className="m-0 text-body">{t(blockedKey(request, blocked))}</p>
      )}
      {failure !== null && <Notice tone="error">{t(`failures.${failure}`)}</Notice>}
      {hasSent && (
        <Notice tone="success">
          {t(request.goesToParent ? 'copy.sentToParent' : 'copy.sent')}
        </Notice>
      )}
    </>
  );
}

/**
 * Renders the panel.
 *
 * @returns the section
 */
export function DataRequestCopyPanel({ request }: { request: DataRequestDetail }) {
  const { t } = useDataRequestsTranslation();
  const copy = useDataRequestCopy(request);
  const blocked = copyBlockedReason(request);
  return (
    <DataRequestSection id="data-request-copy" heading={t('copy.heading')}>
      <CopyNotices request={request} copy={copy} blocked={blocked} />
      {blocked === null && <DataRequestCopyForm isSending={copy.isSending} onSend={copy.send} />}
      <DataRequestFiles
        files={request.files}
        forParent={request.goesToParent}
        onOpen={copy.openFile}
      />
      {request.goesToParent && (
        <DataRequestParentLink
          request={request}
          isResending={copy.isResending}
          onResend={copy.resendParentLink}
        />
      )}
      <DataRequestCopiesSent copies={request.copiesSent} />
    </DataRequestSection>
  );
}
