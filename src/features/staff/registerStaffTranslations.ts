/**
 * Adds the staff pages' text (the "staff" namespace) to the translations when a staff page loads
 * (story S1-E2-07a).
 *
 * Why not with the rest: the admin site is a separate chunk whose code never ships in the
 * reader's bundle (architecture 1.8.1), so its text arrives with it, as the /design page does.
 * Who calls it: StaffRolesPage, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishStaff from '@/locales/en/staff.json';
import romanianStaff from '@/locales/ro/staff.json';

const staffTranslations = createNamespaceTranslations('staff', romanianStaff, englishStaff);

/**
 * Registers the staff texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerStaffTranslations = staffTranslations.register;
