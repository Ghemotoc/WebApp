/**
 * DataRequestParentLink: on the parent's path, where the one-time link to the copy stands: when it
 * was emailed to the parent or guardian, when they first opened it, and "Send the link again"
 * (bundle ADMIN-2, part c3; story S1-E11-09: "for a parent, a one-time link to the checked email
 * address"). Staff never see the link itself: our server emails it.
 *
 * Who shows it: DataRequestCopyPanel, for a request that goes through the parent. What it calls:
 * onResend(), which useDataRequestCopy sends to POST /api/data-request-parent/send.
 */
import { Button } from '@/components/ui/Button';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { DataRequestDetail } from '../../api/dataRequests';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

/** What the part needs. */
interface DataRequestParentLinkProps {
  request: DataRequestDetail;
  isResending: boolean;
  onResend: () => void;
}

/**
 * The line saying where the link stands.
 *
 * @returns the words
 */
function useLinkLine(request: DataRequestDetail): string {
  const { t, i18n } = useDataRequestsTranslation();
  const when = (isoTime: string) => formatRomaniaDateTime(new Date(isoTime), i18n.language);
  if (request.parentCopySentAt === null) return t('copy.parentLink.notSent');
  if (request.parentCopyOpenedAt === null) {
    return t('copy.parentLink.sent', { sent: when(request.parentCopySentAt) });
  }
  return t('copy.parentLink.opened', {
    sent: when(request.parentCopySentAt),
    opened: when(request.parentCopyOpenedAt),
  });
}

/**
 * Renders the part, or nothing before a copy is ready.
 *
 * @returns the part
 */
export function DataRequestParentLink({
  request,
  isResending,
  onResend,
}: DataRequestParentLinkProps) {
  const { t } = useDataRequestsTranslation();
  const line = useLinkLine(request);
  if (request.files.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-base font-semibold text-heading">{t('copy.parentLink.heading')}</h3>
      <p className="m-0 text-body">{line}</p>
      {request.isOpen && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={isResending}
          onClick={onResend}
        >
          {t('copy.parentLink.resend')}
        </Button>
      )}
    </div>
  );
}
