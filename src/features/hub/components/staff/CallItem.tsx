/**
 * CallItem: one call for submissions on the staff page: its English title and details, the
 * organiser's page, the last day and "Paid", with Edit and Delete, or the form while it is being
 * changed (bundle GAPS-12d).
 *
 * Who shows it: CallsSection. What it calls: the useStaffCalls state it is given.
 */
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoPill } from '@/components/ui/InfoPill';

import type { SubmissionCall } from '../../api/hubCalls';
import type { useStaffCalls } from '../../hooks/useStaffCalls';
import { useHubTranslation } from '../../registerHubTranslations';

import { CallForm } from './CallForm';
import { ConfirmDeleteButtons } from './ConfirmDeleteButtons';
import { formatStaffDay } from './formatStaffDay';

/** What one item needs. */
export interface CallItemProps {
  call: SubmissionCall;
  state: ReturnType<typeof useStaffCalls>;
  isEditing: boolean;
  onEdit: () => void;
  onDone: () => void;
}

/**
 * Renders one call.
 *
 * @returns the list item
 */
export function CallItem({ call, state, isEditing, onEdit, onDone }: CallItemProps) {
  const { t, i18n } = useHubTranslation();
  if (isEditing) {
    return (
      <li>
        <Card className="flex flex-col gap-3 p-5">
          <CallForm
            initial={call}
            isBusy={state.isChanging}
            onSave={async (draft) => state.save.mutateAsync(draft).then(onDone)}
            onCancel={onDone}
          />
        </Card>
      </li>
    );
  }
  return (
    <li>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-sm text-meta">
            {t('hubStaff.calls.closesOn', { day: formatStaffDay(call.closesOn, i18n.language) })}
          </p>
          {call.isPaid && <InfoPill tone="sage">{t('hub.calls.paid')}</InfoPill>}
        </div>
        <p lang="en" className="m-0 font-semibold break-words text-heading">
          {call.titleEn}
        </p>
        <p lang="en" className="m-0 text-sm break-words text-body">
          {call.detailsEn}
        </p>
        <p className="m-0 text-sm break-all text-meta">{call.linkUrl}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            aria-label={t('hubStaff.editNamed', { name: call.titleEn })}
            onClick={onEdit}
          >
            {t('hubStaff.edit')}
          </Button>
          <ConfirmDeleteButtons
            name={call.titleEn}
            isBusy={state.isChanging}
            onDelete={() => state.remove.mutate(call.id)}
          />
        </div>
      </Card>
    </li>
  );
}
