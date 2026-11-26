/**
 * Where a password reset lands (story S1-E2-05; fixed for the 27 Nov 2026 trial).
 *
 * Why it exists: Supabase's own reset email (the Send Email hook is off, so Auth sends its
 * dashboard template) opens Auth's verify address, which signs the person in and sends them on to
 * the "redirect to" address. Without one it went to the home page, so the person was logged in
 * but never asked for a new password (ADMIN thread, 26 Nov 2026).
 * Who calls it: api/signIn.ts (the address the reset email sends people back to) and
 * src/lib/supabase.ts (the listener that brings a reset that lands anywhere else to the page).
 * What it calls: nothing; plain functions on addresses.
 */

/** The page that asks for the new password (src/app/router.tsx). */
export const RESET_PASSWORD_PATH = '/reset-password';

/**
 * The address the reset email sends the person back to: this site's reset page.
 *
 * @param origin - the site the request came from, such as window.location.origin
 * @returns the full address, for resetPasswordForEmail's redirectTo
 */
export function resetPasswordAddress(origin: string): string {
  return `${origin.replace(/\/+$/, '')}${RESET_PASSWORD_PATH}`;
}

/**
 * Whether a page must move to the reset page after Auth said "password recovery": every page but
 * the reset page itself, which already shows the form.
 *
 * @param pathname - the current page's path
 * @returns true when the person should be taken to the reset page
 */
export function shouldOpenResetPage(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') !== RESET_PASSWORD_PATH;
}
