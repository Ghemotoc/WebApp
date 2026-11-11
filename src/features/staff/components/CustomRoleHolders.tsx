/**
 * CustomRoleHolders: "Who holds it" on a custom role's card (story S1-E11-33, bundle CMS-2a): each
 * holder's username with a Take back button.
 *
 * Who shows it: CustomRoleCard. What it calls: the onTakeBack it is given, which uses the card's
 * reason.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { CustomRole } from '../api/customRoles';

/** What the list needs. */
interface CustomRoleHoldersProps {
  role: CustomRole;
  /** False while a change runs, or when the role holds more than the signed-in person. */
  canChange: boolean;
  onTakeBack: (userId: string) => void;
}

/**
 * Renders the holders.
 *
 * @returns the heading and the list, or a line saying nobody holds it
 */
export function CustomRoleHolders({ role, canChange, onTakeBack }: CustomRoleHoldersProps) {
  const { t } = useTranslation('staff');
  const headingId = `custom-role-holders-${role.id}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h4 id={headingId} className="eyebrow m-0">
        {t('customRoles.holdersHeading')}
      </h4>
      {role.holders.length === 0 ? (
        <p className="m-0 text-sm text-meta">{t('customRoles.noHolders')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {role.holders.map((holder) => {
            const handle = holder.handle ?? t('roles.noHandle');
            return (
              <li
                key={holder.userId}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-1.5 last:border-b-0"
              >
                <span className="text-body">@{handle}</span>
                <Button
                  type="button"
                  variant="text"
                  disabled={!canChange}
                  aria-label={t('customRoles.takeBackLabel', { name: role.name, handle })}
                  onClick={() => onTakeBack(holder.userId)}
                >
                  {t('customRoles.takeBack')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
