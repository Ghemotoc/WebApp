/**
 * TagsAdminPage: Staff › Tags, where the moderation team approves, renames or rejects the tags
 * writers add, and names tags in a newly opened language (CMS-1e; Robert, 30 Oct 2026).
 *
 * Two views, each with its own address: Waiting for approval (/staff/tags) and Missing a name
 * (/staff/tags/missing). Plain staff components, no doodles. Owner, admin and moderator act; the
 * database refuses everyone else anyway.
 * Who shows it: the router, inside StaffLayout. What it calls: useTagQueue().
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { cn } from '@/lib/utils';

import type { TagQueueView } from '../../api/tagStore';
import { useTagQueue, type TagQueue } from '../../hooks/useTagQueue';
import { registerTagsAdminTranslations } from '../../registerTagsAdminTranslations';

import { TagDecisionRow } from './TagDecisionRow';

/** The two views: their address and label key. */
const views = [
  { view: 'waiting', href: '/staff/tags', labelKey: 'views.waiting' },
  { view: 'missing', href: '/staff/tags/missing', labelKey: 'views.missing' },
] as const;

/**
 * The view links.
 *
 * @returns the navigation
 */
function TagViews({ current }: { current: TagQueueView }) {
  const { t } = useTranslation('tagsAdmin');
  return (
    <nav aria-label={t('views.label')}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {views.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              aria-current={item.view === current ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 items-center rounded-full border border-control-border px-5 text-sm font-semibold no-underline',
                item.view === current ? 'bg-primary text-on-primary' : 'bg-surface text-heading',
              )}
            >
              {t(item.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * What happened last, or why the list can't show; a polite live region.
 *
 * @returns the messages
 */
function QueueFeedback({ queue }: { queue: TagQueue }) {
  const { t } = useTranslation('tagsAdmin');
  const failure = queue.failure?.error ?? queue.loadFailure;
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {queue.outcome !== null && <Notice tone="success">{t(`outcomes.${queue.outcome}`)}</Notice>}
      {failure !== null && <Notice tone="error">{t(`failures.${failure.failure}`)}</Notice>}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Tags screen
 */
export function TagsAdminPage() {
  const { i18n } = useTranslation();
  registerTagsAdminTranslations(i18n);
  const { t } = useTranslation('tagsAdmin');
  const { view: viewPart } = useParams();
  const view: TagQueueView = viewPart === 'missing' ? 'missing' : 'waiting';
  const queue = useTagQueue(view);
  const isEmpty = !queue.isLoading && queue.loadFailure === null && queue.tags.length === 0;
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-10">
      <title>{t('documentTitle')}</title>
      <div className="flex max-w-[760px] flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('heading')}</h1>
        <p className="m-0 text-body">{t('intro')}</p>
      </div>
      <TagViews current={view} />
      <QueueFeedback queue={queue} />
      {isEmpty && <p className="m-0 text-body">{t(`empty.${view}`)}</p>}
      <ul className="m-0 flex max-w-[860px] list-none flex-col p-0">
        {queue.tags.map((tag) => (
          <TagDecisionRow key={`${view}-${tag.id}`} tag={tag} view={view} queue={queue} />
        ))}
      </ul>
    </PageContainer>
  );
}
