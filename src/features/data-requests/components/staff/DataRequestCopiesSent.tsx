/**
 * DataRequestCopiesSent: every copy sent for a request, as the log keeps it: when, until when, and
 * which files, never their contents (bundle ADMIN-2, part c2; story S1-E11-09: "the log keeps …
 * which files were sent"; GDPR art. 5(2)).
 *
 * Who shows it: DataRequestCopyPanel. What it calls: nothing.
 */
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { DataRequestCopySent } from '../../api/dataRequests';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

/**
 * Renders the record, or nothing before the first copy.
 *
 * @returns the list
 */
export function DataRequestCopiesSent({ copies }: { copies: DataRequestCopySent[] }) {
  const { t, i18n } = useDataRequestsTranslation();
  if (copies.length === 0) return null;
  const when = (isoTime: string) => formatRomaniaDateTime(new Date(isoTime), i18n.language);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-base font-semibold text-heading">{t('copy.sentHeading')}</h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {copies.map((copy) => (
          <li key={copy.sentAt} className="border-b border-border py-2 text-body last:border-b-0">
            <p className="m-0">
              {t('copy.sentLine', {
                count: copy.files.length,
                sent: when(copy.sentAt),
                until: when(copy.expiresAt),
              })}
            </p>
            <p className="m-0 text-sm break-all text-meta">
              {copy.files.map((file) => file.name).join(', ')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
