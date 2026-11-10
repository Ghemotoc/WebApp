/**
 * useHomeAddress: where the logo goes (bundle G9 WRITING, part a; design rulebook: "When signed
 * in, the logo goes to the Writers' hub"; planned in G4 SHELL).
 *
 * Who calls it: TopBar and PhoneHeader (src/app/shell/). What it calls: useSession only, so the
 * shell, which every page loads, gains no page code.
 */
import { useSession } from '@/features/auth/hooks/useSession';

/**
 * Says where "home" is for the person looking.
 *
 * @returns "/hub" when someone is signed in, "/" (the public home page) otherwise
 */
export function useHomeAddress(): '/hub' | '/' {
  const { userId } = useSession();
  return userId === null ? '/' : '/hub';
}
