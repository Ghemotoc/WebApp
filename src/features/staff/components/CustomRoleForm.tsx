/**
 * CustomRoleForm: "Make a role" and "Change <role>" on /staff/roles (story S1-E11-33, bundle
 * CMS-2a).
 *
 * A name, what it is for, the access in each area and a reason. The form checks the name, at least
 * one area and the reason before asking; the database checks everything again, including that an
 * admin gives only what they hold.
 * Who shows it: CustomRolesSection. What it calls: the onSave it is given (useCustomRoles).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type {
  AssignableArea,
  CustomRole,
  CustomRoleArea,
  CustomRoleChange,
} from '../api/customRoles';

import { CustomRoleAreaList } from './CustomRoleAreaList';

/** What the form needs. */
interface CustomRoleFormProps {
  /** The role to change, or null to make a new one. */
  role: CustomRole | null;
  assignable: AssignableArea[];
  isChanging: boolean;
  onSave: (change: CustomRoleChange) => Promise<void>;
  onClose: () => void;
}

/**
 * What is missing before the form may ask the database, or null.
 *
 * @param name - the name typed
 * @param areas - the areas picked
 * @param reason - the reason typed
 * @returns the key of the message to show, or null
 */
function missingKey(name: string, areas: CustomRoleArea[], reason: string): string | null {
  if (name.trim().length < 2 || name.trim().length > 40) return 'customRoles.nameMissing';
  if (areas.length === 0) return 'customRoles.areasMissing';
  if (reason.trim() === '') return 'roles.reasonMissing';
  return null;
}

/**
 * The form's fields, filled from the role being changed or empty for a new one.
 *
 * @param role - the role to change, or null
 * @returns each field's value and setter
 */
function useRoleDraft(role: CustomRole | null) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [areas, setAreas] = useState<CustomRoleArea[]>(role?.areas ?? []);
  const [reason, setReason] = useState('');
  return { name, setName, description, setDescription, areas, setAreas, reason, setReason };
}

/**
 * The form's heading: "Make a role", or "Change <name>".
 *
 * @param props.role - the role to change, or null
 * @param props.id - the heading's id, which names the form
 * @returns the heading
 */
function FormHeading({ role, id }: { role: CustomRole | null; id: string }) {
  const { t } = useTranslation('staff');
  const text =
    role === null
      ? t('customRoles.formHeadingNew')
      : t('customRoles.formHeadingEdit', { name: role.name });
  return (
    <h3 id={id} className="m-0 font-heading text-xl font-bold text-heading">
      {text}
    </h3>
  );
}

/**
 * The form's submit step: checks what the form can, then asks the database and closes the form
 * when it agrees.
 *
 * @param role - the role to change, or null for a new one
 * @param draft - the form's fields (useRoleDraft)
 * @param onSave - asks the database (useCustomRoles)
 * @param onClose - closes the form
 * @returns the problem to show (or null) and the submit handler
 */
function useRoleFormSubmit(
  role: CustomRole | null,
  draft: ReturnType<typeof useRoleDraft>,
  onSave: (change: CustomRoleChange) => Promise<void>,
  onClose: () => void,
) {
  const { t } = useTranslation('staff');
  const [problem, setProblem] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    // Step 1: keep the browser from reloading the page.
    event.preventDefault();
    // Step 2: show what is missing before asking the database.
    const missing = missingKey(draft.name, draft.areas, draft.reason);
    if (missing !== null) return setProblem(t(missing));
    setProblem(null);
    // Step 3: ask the database. A refusal is shown by the section from useCustomRoles; the form
    // stays open to fix it.
    await onSave({
      kind: 'save',
      roleId: role?.id ?? null,
      name: draft.name.trim(),
      description: draft.description.trim(),
      areas: draft.areas,
      reason: draft.reason.trim(),
    })
      .then(onClose)
      .catch(errorShownByHook);
  }

  return { problem, handleSubmit };
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function CustomRoleForm({
  role,
  assignable,
  isChanging,
  onSave,
  onClose,
}: CustomRoleFormProps) {
  const { t } = useTranslation('staff');
  const draft = useRoleDraft(role);
  const { problem, handleSubmit } = useRoleFormSubmit(role, draft, onSave, onClose);
  const headingId = role === null ? 'custom-role-new-heading' : `custom-role-edit-${role.id}`;

  return (
    <form
      noValidate
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <FormHeading role={role} id={headingId} />
      <TextInput
        id={`${headingId}-name`}
        label={t('customRoles.name')}
        hint={t('customRoles.nameHint')}
        maxLength={40}
        value={draft.name}
        onChange={(event) => draft.setName(event.target.value)}
      />
      <TextInput
        id={`${headingId}-description`}
        label={t('customRoles.description')}
        hint={t('customRoles.descriptionHint')}
        maxLength={200}
        value={draft.description}
        onChange={(event) => draft.setDescription(event.target.value)}
      />
      <CustomRoleAreaList assignable={assignable} chosen={draft.areas} onChange={draft.setAreas} />
      <TextInput
        id={`${headingId}-reason`}
        label={t('roles.reason')}
        hint={t('roles.reasonHint')}
        value={draft.reason}
        onChange={(event) => draft.setReason(event.target.value)}
      />
      {problem !== null && <Notice tone="error">{problem}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isChanging}>
          {isChanging ? t('roles.changing') : t('customRoles.save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('customRoles.cancel')}
        </Button>
      </div>
    </form>
  );
}
