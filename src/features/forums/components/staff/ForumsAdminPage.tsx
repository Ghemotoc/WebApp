/**
 * ForumsAdminPage: Staff › Forums, where the owner and admins add, name, order, pin and remove
 * forum categories, forums and subforums (bundle FORUMS-1, part a; S1-E8-01, first criterion;
 * architecture 1.8.2: Settings holds "categories, forums").
 *
 * Plain staff components, no doodles. The database refuses everyone but the owner and admins
 * anyway, and logs every change.
 * Who shows it: the router, at /staff/forums inside StaffLayout. What it calls: useForumAdmin().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useForumAdmin, type ForumAdmin } from '../../hooks/useForumAdmin';
import { inTreeOrder, startingValues } from '../../lib/forumForm';
import { registerForumsAdminTranslations } from '../../registerForumsAdminTranslations';

import { ForumAdminRow } from './ForumAdminRow';
import { ForumForm } from './ForumForm';

/**
 * What happened last, or why the list can't show; a polite live region.
 *
 * @returns the messages
 */
function ForumAdminFeedback({ admin }: { admin: ForumAdmin }) {
  const { t } = useTranslation('forumsAdmin');
  const failure = admin.failure?.error ?? admin.loadFailure;
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {admin.outcome !== null && <Notice tone="success">{t(`outcomes.${admin.outcome}`)}</Notice>}
      {failure !== null && <Notice tone="error">{t(`failures.${failure.failure}`)}</Notice>}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Forums screen
 */
export function ForumsAdminPage() {
  const { i18n } = useTranslation();
  registerForumsAdminTranslations(i18n);
  const { t } = useTranslation('forumsAdmin');
  const admin = useForumAdmin();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const isEmpty = !admin.isLoading && admin.loadFailure === null && admin.forums.length === 0;
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-10">
      <title>{t('documentTitle')}</title>
      <div className="flex max-w-[760px] flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('heading')}</h1>
        <p className="m-0 text-body">{t('intro')}</p>
      </div>
      <ForumAdminFeedback admin={admin} />
      {isAddingCategory ? (
        <ForumForm
          formKey="new"
          initial={startingValues(null, null)}
          forums={admin.forums}
          admin={admin}
          onClose={() => setIsAddingCategory(false)}
        />
      ) : (
        <div>
          <Button onClick={() => setIsAddingCategory(true)}>{t('addCategory')}</Button>
        </div>
      )}
      {isEmpty && <p className="m-0 text-body">{t('empty')}</p>}
      <ul className="m-0 flex max-w-[960px] list-none flex-col p-0">
        {inTreeOrder(admin.forums).map((forum) => (
          <ForumAdminRow key={forum.id} forum={forum} forums={admin.forums} admin={admin} />
        ))}
      </ul>
    </PageContainer>
  );
}
