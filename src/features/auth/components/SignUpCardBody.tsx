/**
 * SignUpCardBody: the form, or "Check your email" once the link has gone (story S1-E2-01).
 *
 * Who uses it: SignUpPage, once there is no invite gate in the way.
 * "Send the link again": a password sign-up asks Supabase to resend the confirmation email; an
 * emailed-link sign-up simply asks for a new link the same way it asked for the first.
 */
import { getSupabaseClient } from '@/lib/supabase';
import type { SignUpAnswers } from '@/schemas/signUp';

import { resendConfirmation, signUp, SignUpError, type SignUpContext } from '../api/signUp';
import type { useSignUpForm } from '../hooks/useSignUpForm';

import { CheckYourEmail } from './CheckYourEmail';
import { SignUpForm } from './SignUpForm';

/** What the body needs. */
interface SignUpCardBodyProps {
  form: ReturnType<typeof useSignUpForm>;
  context: SignUpContext | null;
}

/**
 * Renders the form or the next step.
 *
 * @returns the form, or CheckYourEmail
 */
export function SignUpCardBody({ form, context }: SignUpCardBodyProps) {
  if (form.sentTo === null) return <SignUpForm form={form} />;

  /** Sends the link again, the right way for how the person signed up. */
  async function resend() {
    const client = await getSupabaseClient();
    if (client === null || context === null || form.sentTo === null)
      throw new SignUpError('unreachable');
    if (form.answers.method === 'password') await resendConfirmation(client, form.sentTo);
    else await signUp(client, form.answers as SignUpAnswers, context);
  }

  return (
    <CheckYourEmail
      email={form.sentTo}
      isLinkSignUp={form.answers.method === 'link'}
      onResend={resend}
    />
  );
}
