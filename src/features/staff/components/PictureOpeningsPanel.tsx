/**
 * PictureOpeningsPanel: "Uploaded pictures opened by staff" on the staff home page (bundle
 * ADMIN-2, part e2a; Robert's brief of 2 Nov 2026, section 5: every opening of an uploaded
 * picture's original file alerts the owner "by email and in the admin site").
 *
 * Shown only to every owner and the usernames in the setting picture_open_alert_handles; others
 * see nothing. One row per staff member for the last seven days, with a link to the audit log,
 * which names every picture. Plain components, no doodles (staff screens).
 * Who shows it: StaffHomePage. What it calls: usePictureOpenings.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';

import { usePictureOpenings } from '../hooks/usePictureOpenings';

/**
 * Renders the panel, or nothing for someone who isn't alerted.
 *
 * @returns the panel
 */
export function PictureOpeningsPanel() {
  const { t, i18n } = useTranslation('staff');
  const openings = usePictureOpenings();
  if (openings === null) return null;
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (
    <section
      aria-labelledby="picture-openings-heading"
      className="flex max-w-[720px] flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="picture-openings-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('home.pictureOpenings.heading')}
      </h2>
      <p className="m-0 text-sm text-meta">{t('home.pictureOpenings.intro')}</p>
      {openings.length === 0 ? (
        <p className="m-0 text-body">{t('home.pictureOpenings.none')}</p>
      ) : (
        <LabelRows
          rows={openings.map((opening) => ({
            label: `@${opening.staffHandle}`,
            value: t('home.pictureOpenings.row', {
              count: opening.openings,
              last: dateFormat.format(new Date(opening.lastOpenedAt)),
            }),
          }))}
        />
      )}
      <Link to="/staff/audit-log" className="self-start text-link underline">
        {t('home.pictureOpenings.auditLog')}
      </Link>
    </section>
  );
}
