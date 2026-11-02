/**
 * StaffClassActions: what staff do for one class on Staff › Schools › Class spaces (bundle
 * CLASSES, part d; story S1-E8-11 criterion 10): make its code to print for the teacher, and
 * archive it once the pilot ends (criterion 8).
 *
 * The code is shown once, through the teacher's own NewClassInviteCode panel (with Copy and
 * Print); making a new one stops the old. Archiving asks once more, because nobody can undo it.
 * Who shows it: StaffClassCard, for a class that isn't archived. What it calls: the teacher's own
 * hooks, useClassInviteChanges → make_class_invite() and useArchiveClass →
 * archive_class_space(); staff may call both (platform moderators act in any space).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { NewClassInviteCode } from '@/features/spaces/components/NewClassInviteCode';
import { useClassInviteChanges } from '@/features/spaces/hooks/useClassSpaces';
import { useArchiveClass } from '@/features/spaces/hooks/useClassTools';

import type { StaffClassSpace } from '../../api/staffClassSpaces';
import { staffClassSpacesKey } from '../../hooks/useStaffClassSpaces';

/** A pilot code works for 30 days and admits 40, the teacher's own defaults (CLASSES-a). */
const pilotCode = { validDays: 30, admits: 40 };

/** "Archive the class", then the "for good" question. */
function ArchiveAction({ space }: { space: StaffClassSpace }) {
  const { t } = useTranslation('staff');
  const queryClient = useQueryClient();
  const archiving = useArchiveClass(space.slug);
  const [isAsking, setIsAsking] = useState(false);

  /** Archives the class, then reads the list again so its status changes. */
  async function archive() {
    await archiving.archive().catch(() => undefined);
    await queryClient.invalidateQueries({ queryKey: staffClassSpacesKey });
  }

  if (!isAsking) {
    return (
      <Button variant="secondary" onClick={() => setIsAsking(true)}>
        {t('classSpaces.archive')}
      </Button>
    );
  }
  return (
    <div role="group" aria-label={t('classSpaces.archiveConfirm')} className="flex flex-col gap-2">
      <p className="m-0 font-semibold text-heading">{t('classSpaces.archiveConfirm')}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="destructive" disabled={archiving.isRunning} onClick={() => void archive()}>
          {t('classSpaces.archiveYes')}
        </Button>
        <Button variant="text" onClick={() => setIsAsking(false)}>
          {t('classSpaces.cancel')}
        </Button>
      </div>
      {archiving.failure !== null && (
        <Notice tone="error">{t('classSpaces.failures.unreachable')}</Notice>
      )}
    </div>
  );
}

/**
 * Renders the actions.
 *
 * @param props.space - the class
 * @returns the code panel and the buttons
 */
export function StaffClassActions({ space }: { space: StaffClassSpace }) {
  const { t } = useTranslation('staff');
  const invite = useClassInviteChanges(space.slug);
  return (
    <div className="flex flex-col gap-3">
      {invite.made !== null && (
        <NewClassInviteCode invite={invite.made} className={space.name} onDismiss={invite.forget} />
      )}
      {invite.failure !== null && (
        <Notice tone="error">{t('classSpaces.failures.unreachable')}</Notice>
      )}
      <div className="flex flex-wrap gap-3">
        {!space.isLocked && (
          <Button
            disabled={invite.isRunning}
            onClick={() => void invite.make(pilotCode).catch(() => undefined)}
          >
            {t('classSpaces.makeCode')}
          </Button>
        )}
        <ArchiveAction space={space} />
      </div>
    </div>
  );
}
