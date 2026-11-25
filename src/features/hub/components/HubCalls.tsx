/**
 * HubCalls: "Calls for submissions" on the Writers' hub (bundle G9 WRITING, GAPS-12d; since user
 * story 1.3 drawn as plain rows, board A03-WritersHub).
 *
 * Magazines and anthologies looking for writers, kept by staff. Each row: the call's title,
 * opening the organiser's page in a new tab, then "Paid" in bold when the call pays, its details
 * and the days left. Nothing here is an advert (story 1.3).
 * Who shows it: WritersHubPage. What it calls: useHubCalls, hubDates and HubRows.
 */
import type { MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';

import type { SubmissionCall } from '../api/hubCalls';
import { useHubCalls } from '../hooks/useHubCalls';
import { daysUntilClose } from '../lib/hubDates';
import { useHubTranslation } from '../registerHubTranslations';

import { HubRows, type HubRow } from './HubRows';

type Translate = ReturnType<typeof useHubTranslation>['t'];

/**
 * A call's facts: Paid first (as a state, in bold), its details, then the days left.
 *
 * @returns the facts
 */
function callFacts(call: SubmissionCall, now: Date, t: Translate, isRomanian: boolean) {
  const facts: MetaFact[] = [];
  if (call.isPaid) facts.push({ text: t('hub.calls.paid'), kind: 'state' });
  facts.push({ text: isRomanian ? call.detailsRo : call.detailsEn });
  const daysLeft = daysUntilClose(call.closesOn, now);
  facts.push({
    text:
      daysLeft === 0 ? t('hub.calls.closesToday') : t('hub.calls.closesIn', { count: daysLeft }),
  });
  return facts;
}

/**
 * Renders the calls.
 *
 * @param props.now - today, for the days left
 * @returns the section, or nothing when there are no calls
 */
export function HubCalls({ now }: { now: Date }) {
  const { t, i18n } = useHubTranslation();
  const { calls, loadFailed } = useHubCalls();
  if (loadFailed) return <Notice tone="error">{t('hub.calls.loadFailed')}</Notice>;
  if (calls.length === 0) return null;
  const isRomanian = i18n.language === 'ro';
  const rows: HubRow[] = calls.map((call) => {
    const title = isRomanian ? call.titleRo : call.titleEn;
    return {
      key: call.id,
      title,
      href: call.linkUrl,
      outsideLabel: t('hub.calls.openLabel', { title }),
      facts: callFacts(call, now, t, isRomanian),
    };
  });
  return (
    <HubRows
      headingId="hub-calls"
      heading={t('hub.calls.eyebrow')}
      intro={t('hub.calls.intro')}
      rows={rows}
      footer={<p className="m-0 mt-2 type-meta text-ink-muted">{t('hub.calls.outsideNote')}</p>}
    />
  );
}
