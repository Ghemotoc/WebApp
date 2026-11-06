/**
 * AccountActions: the account page's Actions panel (story S1-E11-02; board AdminUsers 8.5): warn,
 * suspend, ban, reset pen name, sign out everywhere, approve a username and correct a birthday
 * (S1-E2-12), each with a reason.
 *
 * Who shows it: AccountPage, only for roles that may act (owner, admin, moderator; architecture
 * 1.8.3). What it calls: useAccountActions.act(); the database checks the role again and writes
 * the audit log (S1-E10-06, S1-E2-04 and this story's functions).
 * A staff account can't be sanctioned (its role is removed first, S1-E2-07a), so the sanction
 * buttons are left out for one. "Start data export" and "Start deletion" from the board come with
 * Data requests (S1-E11-09, after March); until then requests arrive by email (decided 17 Oct
 * 2026, 12:44), and the panel says so.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { AccountSummary } from '../../api/userManagement';
import type { useAccountActions } from '../../hooks/useAccountActions';

import { AccountActionForm, type AccountActionKind } from './AccountActionForm';

/** useAccountActions's result, passed down once. */
type Actions = ReturnType<typeof useAccountActions>;

/**
 * The actions this account allows, in board order.
 *
 * @param summary - the account
 * @returns the kinds to offer
 */
function offeredActions(summary: AccountSummary): AccountActionKind[] {
  const isStaff = summary.staffRoles.length > 0;
  const offered: AccountActionKind[] = isStaff ? [] : ['warning', 'suspension', 'ban'];
  if (summary.penName !== null) offered.push('reset_pen_name');
  offered.push('sign_out_everywhere', 'approve_username', 'correct_birthday');
  // S1-E2-03 and S1-E2-03b: only an active 13-to-15 can have a consent, or a parent's yes to
  // suggestions, to withdraw; the database checks again.
  if (summary.ageBand === '13_to_15' && summary.status === 'active') {
    offered.push('withdraw_parental_consent', 'withdraw_spotlight_consent');
  }
  return offered;
}

/**
 * Renders the panel.
 *
 * @param props.summary - the account
 * @param props.actions - useAccountActions's result
 * @returns the section
 */
export function AccountActions({
  summary,
  actions,
}: {
  summary: AccountSummary;
  actions: Actions;
}) {
  const { t } = useTranslation('staff');
  const [openKind, setOpenKind] = useState<AccountActionKind | null>(null);

  /** Does the action, then closes its form; a refusal stays on screen from actFailure. */
  async function doAction(action: Parameters<Actions['act']>[0]) {
    await actions.act(action);
    setOpenKind(null);
  }

  return (
    <section aria-labelledby="account-actions-heading" className="flex flex-col gap-4">
      <h2
        id="account-actions-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('users.actions.heading')}
      </h2>
      {summary.staffRoles.length > 0 && (
        <p className="m-0 text-sm text-meta">{t('users.actions.staffAccount')}</p>
      )}
      {actions.actFailure !== null && (
        <Notice tone="error">{t(`users.failures.${actions.actFailure}`)}</Notice>
      )}
      {actions.doneKind !== null && openKind === null && (
        <Notice tone="success">{t(`users.actions.done.${actions.doneKind}`)}</Notice>
      )}
      <div className="flex flex-wrap gap-2">
        {offeredActions(summary).map((kind) => (
          <Button
            key={kind}
            variant={kind === 'ban' ? 'destructive' : 'secondary'}
            aria-expanded={openKind === kind}
            onClick={() => setOpenKind(openKind === kind ? null : kind)}
          >
            {t(`users.actions.labels.${kind}`)}
          </Button>
        ))}
      </div>
      {openKind !== null && (
        <AccountActionForm
          key={openKind}
          kind={openKind}
          isBusy={actions.isBusy}
          onDo={doAction}
          onCancel={() => setOpenKind(null)}
        />
      )}
      <p className="m-0 text-sm text-meta">{t('users.actions.dataRequests')}</p>
    </section>
  );
}
