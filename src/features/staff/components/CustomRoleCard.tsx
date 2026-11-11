/**
 * CustomRoleCard: one custom staff role on /staff/roles (story S1-E11-33, bundle CMS-2a): its name,
 * what it is for, its access per area, who holds it, and the ways to give it, take it back, change
 * it or remove it.
 *
 * One reason field on the card is used by every action on it, as on a staff member's card. A role
 * that holds more than the signed-in person shows why it can't be changed, and no actions; the
 * database refuses them anyway (custom_role_in_reach()).
 * Who shows it: CustomRolesSection. What it calls: the onChange and onEdit it is given.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { AccountMatch } from '../api/accountSearch';
import type { CustomRole, CustomRoleChange } from '../api/customRoles';

import { AccountPicker } from './AccountPicker';
import { CustomRoleHolders } from './CustomRoleHolders';

/** What the card needs. */
interface CustomRoleCardProps {
  role: CustomRole;
  isChanging: boolean;
  onChange: (change: CustomRoleChange) => Promise<void>;
  onEdit: () => void;
}

/**
 * Renders the role's access as label and value rows.
 *
 * @param props.role - the role
 * @returns the list
 */
function RoleAreas({ role }: { role: CustomRole }) {
  const { t } = useTranslation('staff');
  return (
    <dl className="m-0 flex flex-col">
      {role.areas.map((entry) => (
        <div
          key={entry.area}
          className="flex justify-between gap-3 border-b border-border py-1.5 last:border-b-0"
        >
          <dt className="text-body">
            {t(`areaNames.${entry.area}`, { defaultValue: entry.area })}
          </dt>
          <dd className="m-0 font-semibold text-heading">
            {entry.access === 'act' ? t('customRoles.accessAct') : t('customRoles.accessView')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The card's state and actions: one reason for every action, the account to give the role to,
 * and the problem to show before asking the database.
 *
 * @param role - the role on the card
 * @param onChange - asks the database for a change (useCustomRoles)
 * @returns the fields' state and the three actions
 */
function useCardActions(role: CustomRole, onChange: (change: CustomRoleChange) => Promise<void>) {
  const { t } = useTranslation('staff');
  const [reason, setReason] = useState('');
  const [account, setAccount] = useState<AccountMatch | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  /** Asks for a change once a reason is written; a refusal is shown by the section. */
  async function ask(change: CustomRoleChange) {
    if (reason.trim() === '') return setProblem(t('roles.reasonMissing'));
    setProblem(null);
    await onChange(change).catch(errorShownByHook);
  }

  /** Gives the role to, or takes it back from, one account. */
  function setHolder(userId: string, shouldHold: boolean) {
    void ask({ kind: 'set_holder', roleId: role.id, userId, shouldHold, reason: reason.trim() });
  }

  return {
    reason,
    setReason,
    account,
    setAccount,
    problem,
    give: () =>
      account === null
        ? setProblem(t('customRoles.accountMissing'))
        : setHolder(account.userId, true),
    takeBack: (userId: string) => setHolder(userId, false),
    remove: () => void ask({ kind: 'remove', roleId: role.id, reason: reason.trim() }),
  };
}

/**
 * "Give <role> to someone": the account search and the Give role button.
 *
 * @param props.role - the role on the card
 * @param props.isChanging - true while a change runs
 * @param props.actions - the card's state and actions (useCardActions)
 * @returns the section
 */
function GiveRole({
  role,
  isChanging,
  actions,
}: {
  role: CustomRole;
  isChanging: boolean;
  actions: ReturnType<typeof useCardActions>;
}) {
  const { t } = useTranslation('staff');
  return (
    <section
      aria-label={t('customRoles.giveHeading', { name: role.name })}
      className="flex flex-col gap-3"
    >
      {/* Each card's picker gets its own ids, so the page's pickers never share a field. */}
      <AccountPicker
        picked={actions.account}
        onPick={actions.setAccount}
        pickerId={`custom-role-account-${role.id}`}
      />
      <Button type="button" className="self-start" disabled={isChanging} onClick={actions.give}>
        {t('customRoles.give')}
      </Button>
    </section>
  );
}

/**
 * Renders the card.
 *
 * @returns the card, as a list item
 */
export function CustomRoleCard({ role, isChanging, onChange, onEdit }: CustomRoleCardProps) {
  const { t } = useTranslation('staff');
  const actions = useCardActions(role, onChange);
  return (
    <li className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-heading text-xl font-bold text-heading">{role.name}</h3>
        {role.description !== '' && <p className="m-0 text-body">{role.description}</p>}
      </div>
      <RoleAreas role={role} />
      {!role.isInReach && <p className="m-0 text-sm text-meta">{t('customRoles.outOfReach')}</p>}
      <CustomRoleHolders
        role={role}
        canChange={role.isInReach && !isChanging}
        onTakeBack={actions.takeBack}
      />
      {role.isInReach && (
        <>
          <TextInput
            id={`custom-role-reason-${role.id}`}
            label={t('roles.reason')}
            hint={t('roles.reasonHint')}
            value={actions.reason}
            onChange={(event) => actions.setReason(event.target.value)}
          />
          <GiveRole role={role} isChanging={isChanging} actions={actions} />
          {actions.problem !== null && <Notice tone="error">{actions.problem}</Notice>}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={onEdit}>
              {t('customRoles.edit')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isChanging}
              aria-label={t('customRoles.removeLabel', { name: role.name })}
              onClick={actions.remove}
            >
              {t('customRoles.remove')}
            </Button>
          </div>
        </>
      )}
    </li>
  );
}
