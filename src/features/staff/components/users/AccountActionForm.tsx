/**
 * AccountActionForm: the small form under an account action's button (story S1-E11-02; board
 * AdminUsers 8.5's confirm step): the extra fields some actions need (how long a suspension lasts;
 * which name a username approval is for; the birthday the person asked for, S1-E2-12), then the
 * reason and the confirm and Cancel buttons.
 *
 * Who shows it: AccountActions. What it calls: onDo(action), which useAccountActions sends to the
 * database. The reason goes to the audit log (and, for a sanction, is the staff note).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { birthdayFromChoice, type BirthdayChoice } from '@/features/account/api/birthday';
import { BirthdayPicker } from '@/features/account/components/BirthdayPicker';
import { ReasonForm } from '@/features/moderation/components/ReasonForm';

import type { AccountAction } from '../../api/userManagement';

/** The actions the page offers, in board order. */
export type AccountActionKind = AccountAction['kind'];

/** The suspension lengths the database accepts (setting suspension_day_choices, S1-E10-06). */
const suspensionDays = ['1', '7', '30'] as const;

/** What the form needs. */
export interface AccountActionFormProps {
  kind: AccountActionKind;
  isBusy: boolean;
  onDo: (action: AccountAction) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Builds the action from the reason and the extra fields.
 *
 * @returns the action to send
 */
function actionFor(
  kind: AccountActionKind,
  reason: string,
  extra: { days: string; nameKind: 'handle' | 'pen_name'; name: string; birthday: BirthdayChoice },
): AccountAction {
  if (kind === 'suspension') return { kind, days: Number(extra.days), reason };
  if (kind === 'correct_birthday') return { kind, ...birthdayFromChoice(extra.birthday), reason };
  if (kind === 'approve_username') {
    return { kind, nameKind: extra.nameKind, name: extra.name.trim(), reason };
  }
  return { kind, reason };
}

/**
 * Renders the form for one action.
 *
 * @returns the extra fields, then the reason form
 */
export function AccountActionForm({ kind, isBusy, onDo, onCancel }: AccountActionFormProps) {
  const { t } = useTranslation('staff');
  const [days, setDays] = useState('7');
  const [nameKind, setNameKind] = useState<'handle' | 'pen_name'>('handle');
  const [name, setName] = useState('');
  // Staff never see the saved birthday (owner only); they pick the one the person gave them.
  const [birthday, setBirthday] = useState<BirthdayChoice>({ month: '', day: '' });
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <p className="m-0 text-body">{t(`users.actions.explain.${kind}`)}</p>
      {kind === 'suspension' && (
        <Select
          id="account-suspension-days"
          label={t('users.actions.howLong')}
          isLabelVisible
          placement="form"
          value={days}
          onChange={setDays}
          options={suspensionDays.map((choice) => ({
            value: choice,
            label: t(`users.actions.days_${choice}`),
          }))}
        />
      )}
      {kind === 'approve_username' && (
        <>
          <Select
            id="account-approve-kind"
            label={t('users.actions.nameKind')}
            isLabelVisible
            placement="form"
            value={nameKind}
            onChange={(value) => setNameKind(value === 'pen_name' ? 'pen_name' : 'handle')}
            options={[
              { value: 'handle', label: t('users.actions.nameKinds.handle') },
              { value: 'pen_name', label: t('users.actions.nameKinds.pen_name') },
            ]}
          />
          <TextInput
            id="account-approve-name"
            label={t('users.actions.approvedName')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </>
      )}
      {kind === 'correct_birthday' && (
        <BirthdayPicker idPrefix="account-birthday" value={birthday} onChange={setBirthday} />
      )}
      <ReasonForm
        id={`account-action-${kind}`}
        label={t('users.actions.reason')}
        confirmLabel={t(`users.actions.confirm.${kind}`)}
        isBusy={isBusy}
        onConfirm={(reason) => onDo(actionFor(kind, reason, { days, nameKind, name, birthday }))}
        onCancel={onCancel}
      />
    </div>
  );
}
