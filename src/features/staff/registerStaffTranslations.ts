/**
 * Adds the staff pages' text (the "staff" namespace) to the translations when a staff page loads
 * (story S1-E2-07a).
 *
 * Why not with the rest: the admin site is a separate chunk whose code never ships in the
 * reader's bundle (architecture 1.8.1), so its text arrives with it, as the /design page does.
 * Who calls it: StaffRolesPage, before it renders anything.
 */
import type { i18n as I18nInstance } from 'i18next';

import englishStaff from '@/locales/en/staff.json';
import romanianStaff from '@/locales/ro/staff.json';

/**
 * Registers the staff texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerStaffTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'staff')) return;
  i18n.addResourceBundle('ro', 'staff', romanianStaff);
  i18n.addResourceBundle('en', 'staff', englishStaff);
}
