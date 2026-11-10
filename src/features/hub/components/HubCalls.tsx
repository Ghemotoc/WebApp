/**
 * HubCalls: "Calls for submissions" in the Writers' hub's side column (bundle GAPS-12d; board
 * WritersHub).
 *
 * One row per call still open: its title as a link to the organiser's own page (a new tab, with
 * rel="nofollow noopener noreferrer": an outside site we don't vouch for), a line of details,
 * how long it stays open and "Paid" when the organiser pays. Paid calls reach adults only; the
 * database decides (writers_hub_calls()). With no open call the block stays away.
 * Who shows it: WritersHubPage. What it calls: useHubCalls.
 */
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import type { SubmissionCall } from '../api/hubCalls';
import { useHubCalls } from '../hooks/useHubCalls';
import { daysUntilClose } from '../lib/hubDates';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * One call's row.
 *
 * @param props.call - the call
 * @param props.now - today, for the days left
 * @returns the list item
 */
function CallRow({ call, now }: { call: SubmissionCall; now: Date }) {
  const { t, i18n } = useHubTranslation();
  // Step 1: the call's words in the interface language.
  const isRomanian = i18n.language === 'ro';
  const title = isRomanian ? call.titleRo : call.titleEn;
  // Step 2: the days left, with "Closes today" on the last day.
  const daysLeft = daysUntilClose(call.closesOn, now);
  const closing =
    daysLeft === 0 ? t('hub.calls.closesToday') : t('hub.calls.closesIn', { count: daysLeft });
  return (
    <li className="flex min-w-0 flex-col items-start gap-1.5 border-b border-border py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <a
        href={call.linkUrl}
        target="_blank"
        rel="nofollow noopener noreferrer"
        aria-label={t('hub.calls.openLabel', { title })}
        className="max-w-full font-heading text-[17px] font-bold wrap-anywhere text-link underline"
      >
        {title}
      </a>
      <p className="m-0 text-sm wrap-anywhere text-body">
        {isRomanian ? call.detailsRo : call.detailsEn}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-meta">{closing}</span>
        {call.isPaid && <InfoPill tone="sage">{t('hub.calls.paid')}</InfoPill>}
      </div>
    </li>
  );
}

/**
 * Renders the block under its eyebrow heading.
 *
 * @param props.now - today, for the days left
 * @returns the block, a plain message when the calls can't be read, or nothing without a call
 */
export function HubCalls({ now }: { now: Date }) {
  const { t } = useHubTranslation();
  const { calls, loadFailed } = useHubCalls();
  if (loadFailed) return <Notice tone="error">{t('hub.calls.loadFailed')}</Notice>;
  if (calls.length === 0) return null;
  return (
    <section aria-labelledby="hub-calls" className="flex flex-col gap-4">
      <h2 id="hub-calls" className="eyebrow m-0">
        {t('hub.calls.eyebrow')}
      </h2>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
        <ul className="m-0 flex min-w-0 list-none flex-col p-0">
          {calls.map((call) => (
            <CallRow key={call.id} call={call} now={now} />
          ))}
        </ul>
        <p className="m-0 text-[13px] text-meta">{t('hub.calls.outsideNote')}</p>
      </div>
    </section>
  );
}
