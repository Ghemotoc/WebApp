/**
 * PromptItem: one writing prompt on the staff page: its English and Romanian words and start day
 * with Edit and Delete, or the form while it is being changed (bundle GAPS-12c). Delete asks
 * once more in place before taking the prompt off the hub.
 *
 * Who shows it: StaffHubPage. What it calls: the useStaffPrompts state it is given.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { dateLocaleFor } from '@/lib/romania-time';

import type { StaffPrompt } from '../../api/hubPrompts';
import type { useStaffPrompts } from '../../hooks/useStaffPrompts';
import { useHubTranslation } from '../../registerHubTranslations';

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
 * Writes a calendar day ("2026-11-09") the reader's way ("9 November 2026").
 *
 * @param day - the day, YYYY-MM-DD
 * @param language - the interface language
 * @returns the day's text
 */
function formatDay(day: string, language: string): string {
  // The day has no time zone of its own, so it is read and written as UTC to keep it unmoved.
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${day}T00:00:00Z`));
}

/**
 * The Delete button, then "Delete it" and "Keep it" once pressed, so one slip deletes nothing.
 *
 * @returns the buttons
 */
function DeleteButtons({ prompt, state }: Pick<PromptItemProps, 'prompt' | 'state'>) {
  const { t } = useHubTranslation();
  const [isAsking, setIsAsking] = useState(false);
  if (!isAsking) {
    return (
      <Button
        variant="destructive"
        aria-label={t('hubStaff.deleteNamed', { name: prompt.promptEn })}
        onClick={() => setIsAsking(true)}
      >
        {t('hubStaff.delete')}
      </Button>
    );
  }
  return (
    <>
      <Button
        variant="destructive"
        disabled={state.isChanging}
        onClick={() => state.remove.mutate(prompt.id)}
      >
        {t('hubStaff.deleteConfirm')}
      </Button>
      <Button variant="secondary" onClick={() => setIsAsking(false)}>
        {t('hubStaff.keep')}
      </Button>
    </>
  );
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
          {t('hubStaff.prompts.startsOn', { day: formatDay(prompt.startsOn, i18n.language) })}
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
          <DeleteButtons prompt={prompt} state={state} />
        </div>
      </Card>
    </li>
  );
}
