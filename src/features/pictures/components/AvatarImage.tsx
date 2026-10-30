/**
 * AvatarImage: a profile's uploaded picture inside the round avatar, or nothing (story S1-E10-05).
 *
 * Shown only once its check has passed (CLAUDE.md rule 19). On one's own profile a newer picture
 * still in its check shows with "Waiting for a check", so the person knows why others don't see
 * it yet. When there is no picture to draw the caller's initials stay.
 * Decorative, like the initials: the name is the page's heading beside it.
 * Who uses it: ProfileAvatar and Settings › Profile. What it calls: useAvatarPicture.
 */
import { useTranslation } from 'react-i18next';

import { useAvatarPicture } from '../hooks/usePictures';

/**
 * Renders the picture over the initials, or nothing.
 *
 * @param props.handle - the username, without "@"
 * @returns the picture, or null
 */
export function AvatarImage({ handle }: { handle: string }) {
  const { t } = useTranslation();
  const picture = useAvatarPicture(handle);
  const view = picture.data;
  if (view === undefined || view === null || view.url === null || view.state === 'removed')
    return null;
  return (
    <>
      <img src={view.url} alt="" className="absolute inset-0 size-full rounded-full object-cover" />
      {view.state !== 'visible' && (
        <span className="absolute -bottom-2 left-1/2 inline-flex h-6 -translate-x-1/2 items-center rounded-full border border-border bg-surface px-2 text-xs leading-none font-semibold whitespace-nowrap text-heading">
          {view.state === 'waiting_for_person'
            ? t('pictures.waitingForPerson')
            : t('pictures.waitingForCheck')}
        </span>
      )}
    </>
  );
}
