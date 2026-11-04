/**
 * ClassInviteSheet: the page a teacher prints to hand a class code out (bundle 14d IDEAS-3,
 * part b; idea IDEA-20261102-3, criterion 1).
 *
 * Hidden on screen. When the teacher presses Print, the print styles in src/styles/index.css
 * (".class-invite-sheet") hide everything else, so the paper holds only the class's name, the code
 * in large letters, the QR code, the link and the date the code stops working.
 * Who shows it: NewClassInviteCode, next to its Print button.
 * What it calls: ClassInviteQrCode.
 */
import type { NewClassInvite } from '../api/classSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';
import { ClassInviteQrCode } from './ClassInviteQrCode';

/**
 * Renders the sheet.
 *
 * @param props.invite - the code just made, with its link and end date
 * @param props.className - the class's name, printed as the heading
 * @param props.expires - the end date, already written out in the teacher's language
 * @returns the sheet, shown only in print
 */
export function ClassInviteSheet({
  invite,
  className,
  expires,
}: {
  invite: NewClassInvite;
  className: string;
  expires: string;
}) {
  const { t } = useSpacesTranslation();
  return (
    <section
      aria-label={t('classInvite.sheetLabel')}
      data-testid="class-invite-sheet"
      className="class-invite-sheet hidden flex-col items-center gap-6 text-center"
    >
      <p className="m-0 text-xl">{t('classInvite.sheetIntro')}</p>
      <p className="m-0 font-heading text-4xl font-bold">{className}</p>
      <p className="m-0 font-heading text-5xl font-bold tracking-[0.08em] break-all">
        {invite.code}
      </p>
      <ClassInviteQrCode link={invite.link} className="block size-[70mm]" />
      <p className="m-0 text-base break-all">{invite.link}</p>
      <p className="m-0 text-base">{t('classInvite.sheetUntil', { expires })}</p>
    </section>
  );
}
