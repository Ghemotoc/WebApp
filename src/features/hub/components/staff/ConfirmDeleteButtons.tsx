/**
 * ConfirmDeleteButtons: the Delete button on the Writers' hub staff page, then "Delete it" and
 * "Keep it" once pressed, so one slip deletes nothing (bundles GAPS-12c and GAPS-12d).
 *
 * Who shows it: PromptItem and CallItem. What it calls: the onDelete it is given.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

import { useHubTranslation } from '../../registerHubTranslations';

/** What the buttons need. */
export interface ConfirmDeleteButtonsProps {
  /** What is being deleted, for the button's accessible name. */
  name: string;
  isBusy: boolean;
  onDelete: () => void;
}

/**
 * Renders Delete, or the two answers once it was pressed.
 *
 * @returns the buttons
 */
export function ConfirmDeleteButtons({ name, isBusy, onDelete }: ConfirmDeleteButtonsProps) {
  const { t } = useHubTranslation();
  const [isAsking, setIsAsking] = useState(false);
  if (!isAsking) {
    return (
      <Button
        variant="destructive"
        aria-label={t('hubStaff.deleteNamed', { name })}
        onClick={() => setIsAsking(true)}
      >
        {t('hubStaff.delete')}
      </Button>
    );
  }
  return (
    <>
      <Button variant="destructive" disabled={isBusy} onClick={onDelete}>
        {t('hubStaff.deleteConfirm')}
      </Button>
      <Button variant="secondary" onClick={() => setIsAsking(false)}>
        {t('hubStaff.keep')}
      </Button>
    </>
  );
}
