/**
 * useInviteGateForm: the invite code field on the sign-up card (story S1-E2-01; accessibility
 * fixes in S1-E2-QA from Robert's staging check, 17 Oct 2026).
 *
 * What it handles:
 * - an empty code: "Enter the code from your invitation", on the field, and focus back on it;
 * - a code that didn't work: the address becomes /join/<code>, the page checks it and shows the
 *   gate again; the field keeps the typed code, takes the focus and shows why (WCAG 2.2, 3.3.1
 *   error identification and 2.4.3 focus order).
 * Who calls it: components/InviteGate.tsx.
 * What it calls next: the router, with the same address an invite link would open.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

/** The field's id, shared with InviteGate so focus can find it. */
export const inviteCodeFieldId = 'invite-code';

/**
 * Keeps the code, the empty-code error and the focus.
 *
 * @param codeFromAddress - the code in /join/<code> that didn't work, or null on /sign-up
 * @returns the code, whether the empty-code error shows, and the change and submit handlers
 */
export function useInviteGateForm(codeFromAddress: string | null) {
  const navigate = useNavigate();
  // Step 1: start from the code that was tried, so nobody has to type it again.
  const [code, setCode] = useState(codeFromAddress ?? '');
  const [isEmptyCode, setIsEmptyCode] = useState(false);

  // Step 2: after a code didn't work, the gate appears again; put the focus on the field, where
  // the reason is read out with it, instead of leaving it at the top of the page.
  useEffect(() => {
    if (codeFromAddress !== null) document.getElementById(inviteCodeFieldId)?.focus();
  }, [codeFromAddress]);

  /** Keeps what is typed and clears the empty-code error. */
  function changeCode(newCode: string) {
    setCode(newCode);
    setIsEmptyCode(false);
  }

  /** Opens the same address an invite link would, or says the code is missing. */
  function submitCode(event: FormEvent) {
    event.preventDefault();
    const trimmedCode = code.trim();
    if (trimmedCode === '') {
      setIsEmptyCode(true);
      document.getElementById(inviteCodeFieldId)?.focus();
      return;
    }
    void navigate(`/join/${encodeURIComponent(trimmedCode)}`);
  }

  return { code, isEmptyCode, changeCode, submitCode };
}
