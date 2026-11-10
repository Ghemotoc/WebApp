/**
 * PromptItem: one writing prompt on the staff page: its English and Romanian words and start day
 * with Edit and Delete, or the form while it is being changed (bundle GAPS-12c). Delete asks
 * once more in place before taking the prompt off the hub (ConfirmDeleteButtons).
 *
 * Who shows it: PromptsSection. What it calls: the useStaffPrompts state it is given.
 */
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import type { StaffPrompt } from '../../api/hubPrompts';
import type { useStaffPrompts } from '../../hooks/useStaffPrompts';
import { useHubTranslation } from '../../registerHubTranslations';

import { ConfirmDeleteButtons } from './ConfirmDeleteButtons';
import { formatStaffDay } from './formatStaffDay';
import { PromptForm } from './PromptForm';

/** What one item needs. */
export interface PromptItemProps {
  prompt: StaffPrompt;
  state: ReturnType<typeof useStaffPrompts>;
  isEditing: boolean;
  onEdit: () => void;
  onDone: () => void;
}

/**
 * Renders one prompt.
 *
 * @returns the list item
 */
export function PromptItem({ prompt, state, isEditing, onEdit, onDone }: PromptItemProps) {
  const { t, i18n } = useHubTranslation();
  if (isEditing) {
    return (
      <li>
        <Card className="flex flex-col gap-3 p-5">
          <PromptForm
            initial={prompt}
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
        <p className="m-0 text-sm text-meta">
          {t('hubStaff.prompts.startsOn', { day: formatStaffDay(prompt.startsOn, i18n.language) })}
        </p>
        <p lang="en" className="m-0 font-semibold break-words text-heading">
          {prompt.promptEn}
        </p>
        <p lang="ro" className="m-0 text-sm break-words text-body">
          {prompt.promptRo}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            aria-label={t('hubStaff.editNamed', { name: prompt.promptEn })}
            onClick={onEdit}
          >
            {t('hubStaff.edit')}
          </Button>
          <ConfirmDeleteButtons
            name={prompt.promptEn}
            isBusy={state.isChanging}
            onDelete={() => state.remove.mutate(prompt.id)}
          />
        </div>
      </Card>
    </li>
  );
}
