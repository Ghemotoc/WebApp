/**
 * StaffMailInboxPage: /staff/moderator-mail, the moderation team's one shared inbox (story
 * S1-E10-11; architecture 1.8.2: Moderation holds moderator mail).
 *
 * Every thread, newest activity first, with filters for the status and who it is assigned to.
 * Plain components, no doodles (staff screens). The database refuses anyone outside moderation
 * staff, and the page says so.
 * Who shows it: the router, inside StaffLayout. What it calls: useStaffInbox.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';

import type { MailThreadSummary } from '../api/moderatorMail';
import type { InboxFilters } from '../api/staffModeratorMail';
import { useStaffInbox } from '../hooks/useStaffMail';
import { useMailTranslation } from '../registerMailTranslations';

/**
 * One thread in the inbox.
 *
 * @returns a list item
 */
function InboxRow({ thread }: { thread: MailThreadSummary }) {
  const { t, i18n } = useMailTranslation();
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(thread.lastMessageAt));
  let assigned = t('staff.unassigned');
  if (thread.assignedToMe) assigned = t('staff.assignedToYou');
  else if (thread.assignedHandle !== null)
    assigned = t('staff.assignedTo', { handle: thread.assignedHandle });
  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/staff/moderator-mail/${thread.reference}`}
          className="font-semibold break-words text-link underline"
        >
          {thread.subject}
        </Link>
        <InfoPill tone={thread.status === 'open' ? 'gold' : 'neutral'}>
          {t(`statuses.${thread.status}`)}
        </InfoPill>
      </div>
      <p className="m-0 text-sm text-meta">
        {t('staff.rowMeta', {
          reference: thread.reference,
          handle: thread.memberHandle ?? '',
          count: thread.messageCount,
          date: when,
        })}
      </p>
      <p className="m-0 text-sm text-body">{assigned}</p>
    </li>
  );
}

/**
 * The filters.
 *
 * @returns the two drop-downs
 */
function InboxFiltersRow({
  filters,
  onChange,
}: {
  filters: InboxFilters;
  onChange: (filters: InboxFilters) => void;
}) {
  const { t } = useMailTranslation();
  return (
    <div
      role="group"
      aria-label={t('staff.filtersLabel')}
      className="flex flex-wrap items-end gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <Select
        id="mail-status"
        label={t('staff.status')}
        isLabelVisible
        value={filters.status}
        onChange={(value) => onChange({ ...filters, status: value as InboxFilters['status'] })}
        options={[
          { value: 'open', label: t('statuses.open') },
          { value: 'waiting', label: t('statuses.waiting') },
          { value: 'closed', label: t('statuses.closed') },
          { value: '', label: t('staff.allStatuses') },
        ]}
      />
      <Select
        id="mail-assigned"
        label={t('staff.assigned')}
        isLabelVisible
        value={filters.assigned}
        onChange={(value) => onChange({ ...filters, assigned: value as InboxFilters['assigned'] })}
        options={[
          { value: '', label: t('staff.assignedAll') },
          { value: 'mine', label: t('staff.assignedMine') },
          { value: 'nobody', label: t('staff.assignedNobody') },
        ]}
      />
    </div>
  );
}

/**
 * The list, or why there is none.
 *
 * @returns the list part
 */
function InboxList({ state }: { state: ReturnType<typeof useStaffInbox> }) {
  const { t } = useMailTranslation();
  if (state.failure === 'not_allowed')
    return <p className="m-0 text-body">{t('staff.notAllowed')}</p>;
  if (state.failure !== null) return <Notice tone="error">{t('staff.loadFailed')}</Notice>;
  if (state.inbox.data === undefined) return <p className="m-0 text-meta">{t('staff.loading')}</p>;
  if (state.inbox.data.length === 0) return <p className="m-0 text-body">{t('staff.empty')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label={t('staff.listLabel')}>
      {state.inbox.data.map((thread) => (
        <InboxRow key={thread.reference} thread={thread} />
      ))}
    </ul>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function StaffMailInboxPage() {
  const { t } = useMailTranslation();
  const state = useStaffInbox();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staff.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('staff.heading')}
        </h1>
        <p className="m-0 text-body">{t('staff.intro')}</p>
      </div>
      <InboxFiltersRow filters={state.filters} onChange={state.setFilters} />
      <InboxList state={state} />
    </PageContainer>
  );
}
