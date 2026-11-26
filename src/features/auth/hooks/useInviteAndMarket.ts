/**
 * useInviteAndMarket: the sign-up page's invite and country together, so a working invite can let
 * a person in from a country that isn't open yet (INVITE-MARKET; Robert, 26 Nov 2026: "anybody
 * who is invited by an invite link is let in regardless if they are from a country that's not on
 * the market list yet").
 *
 * Who calls it: SignUpPage. What it calls: useSignUpMarket (the connection's country, S1-E2-10)
 * and useInviteCheck (check_invite, S1-E2-01). The database makes the same decision again in
 * create_profile_from_sign_up(), so this hook only decides what the page shows.
 * Rules: the code in the address is read while invite_only or the waiting list is on, as before,
 * and also whenever the country is closed, so the invite can open it. Only a code check_invite
 * calls 'valid' opens a closed country; while the check runs, the page neither sends the person
 * to /not-open nor puts them on the waiting list.
 */
import { useInviteCheck } from './useInviteCheck';
import { useSignUpMarket, type SignUpMarket } from './useSignUpMarket';

/** The flags the page has already read. */
export interface InviteAndMarketFlags {
  isInviteOnly: boolean;
  isWaitlistOn: boolean;
  isAdultsOnly: boolean;
}

/** What the page needs to know. */
export interface InviteAndMarket {
  market: SignUpMarket;
  invite: ReturnType<typeof useInviteCheck>;
  /** The code from the address the page uses, or null. */
  inviteCode: string | null;
  /** True when sign-up is closed from here for this person: a closed country and no working invite. */
  isClosedHere: boolean;
  /** True while a code from the address is still being checked. */
  isCheckingInvite: boolean;
}

/**
 * Reads the country and the invite and decides whether the country is closed for this person.
 *
 * @param code - the code from the /join/<code> address, or undefined
 * @param flags - invite_only, the waiting list and adults_only
 * @returns the market, the invite check and the decisions above
 */
export function useInviteAndMarket(
  code: string | undefined,
  flags: InviteAndMarketFlags,
): InviteAndMarket {
  // Step 1: the country of the connection; any country may join the invited test (Q6).
  const market = useSignUpMarket(flags.isInviteOnly && flags.isAdultsOnly);
  // Step 2: the code is read when a flag needs it, or when a closed country might let it in.
  const readsCode = flags.isInviteOnly || flags.isWaitlistOn || market.isClosed;
  const inviteCode = readsCode ? (code ?? null) : null;
  const invite = useInviteCheck(inviteCode);
  // Step 3: a working invite opens a closed country (INVITE-MARKET).
  const inviteLetsIn = inviteCode !== null && invite.data === 'valid';
  const isCheckingInvite = inviteCode !== null && invite.isPending;
  return {
    market,
    invite,
    inviteCode,
    isClosedHere: market.isClosed && !inviteLetsIn,
    isCheckingInvite,
  };
}
