/**
 * TeacherConfirmPage: the page a school email link opens, /teacher-check/confirm#<token> (story
 * S1-E2-11, criterion 3).
 *
 * Who shows it: the router. The token sits after "#", so it never reaches a server log or a
 * Referer header (the signed-link pattern of ADR 0011). What it calls: useTeacherEmailConfirm.
 * What it says: the badge is granted (a .edu.ro address), the address is confirmed and our team
 * will check the school (any other), or the link has expired or no longer works. Works signed out,
 * on any device. Plain page: no doodles.
 */
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useTeacherEmailConfirm } from '../hooks/useTeacherEmailConfirm';

/**
 * What the card says.
 *
 * @returns the line for the outcome
 */
function ConfirmBody({ token }: { token: string }) {
  const { t } = useTranslation('account');
  const { outcome, failed } = useTeacherEmailConfirm(token);
  if (failed) return <Notice tone="error">{t('teacherBadge.confirm.failed')}</Notice>;
  if (outcome === null)
    return <p className="m-0 text-body">{t('teacherBadge.confirm.checking')}</p>;
  const tone = outcome === 'approved' || outcome === 'waiting_for_staff' ? 'success' : 'info';
  return <Notice tone={tone}>{t(`teacherBadge.confirm.${outcome}`)}</Notice>;
}

/**
 * Renders the page.
 *
 * @returns the confirmation screen
 */
export function TeacherConfirmPage() {
  const { t } = useTranslation('account');
  const token = useLocation().hash.replace(/^#/, '');
  return (
    <PageContainer className="flex justify-center pt-12 pb-7">
      <title>{t('teacherBadge.confirm.documentTitle')}</title>
      <section
        aria-labelledby="teacher-confirm-heading"
        className="flex w-full max-w-[640px] flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('teacherBadge.confirm.eyebrow')}</Eyebrow>
          <h1
            id="teacher-confirm-heading"
            className="m-0 font-heading text-[30px] font-bold text-heading"
          >
            {t('teacherBadge.confirm.heading')}
          </h1>
        </div>
        <div aria-live="polite">
          <ConfirmBody token={token} />
        </div>
        <Link to="/settings#teacher-badge" className="self-start font-semibold text-link underline">
          {t('teacherBadge.confirm.goToSettings')}
        </Link>
      </section>
    </PageContainer>
  );
}
