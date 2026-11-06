/**
 * LogsPage: /staff/logs, where owner and admin see the app's calls, where they failed, and the
 * browser's crashes (bundle LOGS-1, part d; Robert, 6 Nov 2026: "a log where we can see every call
 * that's been made, where it failed, and so on, in case we ever need to track anything").
 *
 * Three views, picked with chips and kept in the address (?view=calls|failures|crashes), so a
 * view can be shared with another admin. Plain components, no doodles (staff screens).
 * Who shows it: the router, inside StaffLayout; the menu shows it to owner and admin
 * (staff_role_areas 'call_log'). The database refuses everyone else, and the page says so.
 * What it calls: CallsView, FailuresView and CrashesView.
 */
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

import { CallsView } from './CallsView';
import { CrashesView } from './CrashesView';
import { FailuresView } from './FailuresView';

/** The views, in chip order. */
const views = ['calls', 'failures', 'crashes'] as const;
type LogsView = (typeof views)[number];

/**
 * Reads the view from the address.
 *
 * @param value - the "view" parameter, or null
 * @returns the view, Calls when the parameter is missing or unknown
 */
function viewOf(value: string | null): LogsView {
  return views.find((view) => view === value) ?? 'calls';
}

/**
 * Renders the page.
 *
 * @returns the Logs screen
 */
export function LogsPage() {
  const { t } = useTranslation('staff');
  const [searchParams, setSearchParams] = useSearchParams();
  const view = viewOf(searchParams.get('view'));

  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('logs.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('logs.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('logs.heading')}</h1>
        <p className="m-0 text-body">{t('logs.intro')}</p>
      </div>
      <ChoiceChips
        label={t('logs.viewsLabel')}
        options={views.map((option) => ({ value: option, label: t(`logs.views.${option}`) }))}
        value={view}
        onChange={(picked) => setSearchParams({ view: picked }, { replace: true })}
      />
      <section aria-label={t(`logs.views.${view}`)}>
        {view === 'calls' && <CallsView />}
        {view === 'failures' && <FailuresView />}
        {view === 'crashes' && <CrashesView />}
      </section>
    </PageContainer>
  );
}
