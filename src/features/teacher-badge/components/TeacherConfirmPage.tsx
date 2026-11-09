/**
 * TeacherConfirmPage: the page a school email link opens, /teacher-check/confirm#<token> (story
 * S1-E2-11, criterion 3; liquid glass in bundle G8e, board TeacherConfirm).
 *
 * Who shows it: the router. The token sits after "#", so it never reaches a server log or a
 * Referer header (the signed-link pattern of ADR 0011). What it calls: useTeacherEmailConfirm,
 * then TeacherConfirmSteps for an address a moderator still has to check.
 * What it says: the badge is granted (a .edu.ro address), the address is confirmed and a moderator
 * will check the school (any other), or the link has expired or no longer works. The heading
 * names the outcome, so a colour never says it alone. Works signed out, on any device.
 * Board values: one centred glass card with 40 px corners, a round icon, the eyebrow, the heading,
 * one line under it and one main button. Plain page: no doodles.
 */
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { cn } from '@/lib/utils';

import { useTeacherEmailConfirm } from '../hooks/useTeacherEmailConfirm';

import { TeacherConfirmSteps } from './TeacherConfirmSteps';

/** Where the link stands: still checking, one of the outcomes, or the check itself failed. */
type ConfirmState = 'checking' | 'failed' | 'approved' | 'waiting_for_staff' | 'expired' | 'gone';

/**
 * Works out where the link stands from the hook's answer.
 *
 * @param token - the token after "#"
 * @returns the state the card shows
 */
function useConfirmState(token: string): ConfirmState {
  const { outcome, failed } = useTeacherEmailConfirm(token);
  if (failed) return 'failed';
  if (outcome === null) return 'checking';
  return outcome;
}

/**
 * The round icon above the heading: a tick on the theme's accent when it worked, an info mark
 * otherwise. Decoration only, since the heading says the same.
 *
 * @param props.isGood - true for approved and waiting_for_staff
 * @returns the icon
 */
function OutcomeIcon({ isGood }: { isGood: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-14 items-center justify-center rounded-full',
        isGood ? 'bg-primary text-on-primary' : 'border border-border bg-surface text-heading',
      )}
    >
      <ActionIcon name={isGood ? 'check' : 'info'} size={24} />
    </span>
  );
}

/**
 * The one main button: Spaces once the badge is there (a teacher can now open a class), Settings
 * otherwise, where the request's state and a new link live.
 *
 * @param props.state - where the link stands
 * @returns the link drawn as a button
 */
function NextLink({ state }: { state: ConfirmState }) {
  const { t } = useTranslation('account');
  const classes = buttonClassName({ size: 'lg' }, 'self-start');
  if (state === 'approved') {
    return (
      <Link to="/spaces" className={classes}>
        {t('teacherBadge.confirm.goToSpaces')}
      </Link>
    );
  }
  return (
    <Link to="/settings#teacher-badge" className={classes}>
      {t('teacherBadge.confirm.goToSettings')}
    </Link>
  );
}

/**
 * Renders the page.
 *
 * @returns the confirmation screen
 */
export function TeacherConfirmPage() {
  const { t } = useTranslation('account');
  const token = useLocation().hash.replace(/^#/, '');
  const state = useConfirmState(token);
  const isGood = state === 'approved' || state === 'waiting_for_staff';
  return (
    <PageContainer className="flex justify-center py-10 md:py-14">
      <title>{t('teacherBadge.confirm.documentTitle')}</title>
      <section
        aria-labelledby="teacher-confirm-heading"
        className="flex w-full max-w-[640px] flex-col gap-6 rounded-[40px] border border-border bg-surface p-6 shadow-card md:p-10"
      >
        {state !== 'checking' && <OutcomeIcon isGood={isGood} />}
        {/* The heading and the line change once the link is checked, so they are read out. */}
        <div className="flex flex-col gap-2" aria-live="polite">
          <Eyebrow>{t('teacherBadge.confirm.eyebrow')}</Eyebrow>
          <h1
            id="teacher-confirm-heading"
            className="m-0 font-heading text-[30px] leading-tight font-bold text-heading md:text-[36px]"
          >
            {t(`teacherBadge.confirm.headings.${state}`)}
          </h1>
          {state !== 'checking' && (
            <p className="m-0 text-base leading-relaxed text-body">
              {t(`teacherBadge.confirm.${state}`)}
            </p>
          )}
        </div>
        {state === 'waiting_for_staff' && <TeacherConfirmSteps />}
        <NextLink state={state} />
      </section>
    </PageContainer>
  );
}
