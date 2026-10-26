/**
 * AccountActionForm: the small form under an account action's button (story S1-E11-02; board
 * AdminUsers 8.5's confirm step): the extra fields some actions need (how long a suspension lasts;
 * which name a username approval is for; the birthday the person asked for, S1-E2-12), then the
 * reason and the confirm and Cancel buttons. A warning, suspension or ban also asks what we tell
 * the person: it becomes the facts in their statement of reasons (S1-E10-04; DSA art. 17).
 *
 * Who shows it: AccountActions. What it calls: onDo(action), which useAccountActions sends to the
 * database. The reason goes to the audit log (and, for a sanction, is the staff note).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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
  extra: {
    days: string;
    nameKind: 'handle' | 'pen_name';
    name: string;
    birthday: BirthdayChoice;
    message: string;
  },
): AccountAction {
  const messageToPerson = extra.message.trim() === '' ? undefined : extra.message.trim();
  if (kind === 'suspension') return { kind, days: Number(extra.days), reason, messageToPerson };
  if (kind === 'warning' || kind === 'ban') return { kind, reason, messageToPerson };
  if (kind === 'correct_birthday') return { kind, ...birthdayFromChoice(extra.birthday), reason };
  if (kind === 'approve_username') {
    return { kind, nameKind: extra.nameKind, name: extra.name.trim(), reason };
  }
  return { kind, reason };
}

/**
 * The fields for approving a username false hit: which kind of name, and the name itself
 * (S1-E2-04).
 *
 * @returns the select and the text field
 */
function ApproveUsernameFields({
  nameKind,
  name,
  onNameKindChange,
  onNameChange,
}: {
  nameKind: 'handle' | 'pen_name';
  name: string;
  onNameKindChange: (nameKind: 'handle' | 'pen_name') => void;
  onNameChange: (name: string) => void;
}) {
  const { t } = useTranslation('staff');
  return (
    <>
      <Select
        id="account-approve-kind"
        label={t('users.actions.nameKind')}
        isLabelVisible
        placement="form"
        value={nameKind}
        onChange={(value) => onNameKindChange(value === 'pen_name' ? 'pen_name' : 'handle')}
        options={[
          { value: 'handle', label: t('users.actions.nameKinds.handle') },
          { value: 'pen_name', label: t('users.actions.nameKinds.pen_name') },
        ]}
      />
      <TextInput
        id="account-approve-name"
        label={t('users.actions.approvedName')}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
      />
    </>
  );
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
  const [message, setMessage] = useState('');
  const isSanction = kind === 'warning' || kind === 'suspension' || kind === 'ban';
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
        <ApproveUsernameFields
          nameKind={nameKind}
          name={name}
          onNameKindChange={setNameKind}
          onNameChange={setName}
        />
      )}
      {kind === 'correct_birthday' && (
        <BirthdayPicker idPrefix="account-birthday" value={birthday} onChange={setBirthday} />
      )}
      {isSanction && (
        <Textarea
          id="account-sanction-message"
          label={t('users.actions.message')}
          hint={t('users.actions.messageHint')}
          rows={3}
          maxLength={4000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      )}
      <ReasonForm
        id={`account-action-${kind}`}
        label={t('users.actions.reason')}
        confirmLabel={t(`users.actions.confirm.${kind}`)}
        isBusy={isBusy}
        onConfirm={(reason) =>
          onDo(actionFor(kind, reason, { days, nameKind, name, birthday, message }))
        }
        onCancel={onCancel}
      />
    </div>
  );
}
