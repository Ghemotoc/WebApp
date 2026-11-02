/**
 * SchoolsTabs: the tabs of the Schools area, Verify teachers, Class spaces and Certificates (story
 * S1-E2-11; bundle CLASSES, part d, S1-E8-11 criterion 10, and part e, S1-E8-12 criterion 7;
 * board AdminSchools 8.9).
 *
 * Who shows it: TeacherChecksPage, ClassSpacesPage and StaffCertificatesPage. Every tab needs the
 * same Schools access, so whoever sees one sees them all. The tabs are links (each tab is its own address), marked with
 * aria-current, not an ARIA tab widget, like UsersTabs.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

/** The tabs: their addresses and texts. */
const schoolsTabs = [
  { href: '/staff/schools/teachers', labelKey: 'schoolsTabs.teachers' },
  { href: '/staff/schools/classes', labelKey: 'schoolsTabs.classes' },
  { href: '/staff/schools/certificates', labelKey: 'schoolsTabs.certificates' },
] as const;

/**
 * Renders the tabs.
 *
 * @returns the tab row
 */
export function SchoolsTabs() {
  const { t } = useTranslation('staff');
  return (
    <nav aria-label={t('schoolsTabs.label')}>
      <ul className="m-0 flex list-none flex-wrap gap-2 border-b border-border p-0">
        {schoolsTabs.map((tab) => (
          <li key={tab.href}>
            <NavLink
              to={tab.href}
              end
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center border-b-2 px-3 font-semibold no-underline ${
                  isActive ? 'border-primary text-heading' : 'border-transparent text-link'
                }`
              }
            >
              {t(tab.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
