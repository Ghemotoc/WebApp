/**
 * SignUpCardBody: the form; "Check your email" once the link has gone (story S1-E2-01); or the
 * age refusal when the age rules end sign-up (story S1-E2-02).
 *
 * Who uses it: SignUpPage, once there is no invite gate in the way.
 * "Send the link again": a password sign-up asks Supabase to resend the confirmation email; an
 * emailed-link sign-up simply asks for a new link the same way it asked for the first.
 */
import { getSupabaseClient } from '@/lib/supabase';
import type { SignUpAnswers } from '@/schemas/signUp';

import { resendConfirmation, signUp, SignUpError, type SignUpContext } from '../api/signUp';
import type { useSignUpForm } from '../hooks/useSignUpForm';

import { AgeRefusal } from './AgeRefusal';
import { CheckYourEmail } from './CheckYourEmail';
import { SignUpForm } from './SignUpForm';

/** What the body needs. */
interface SignUpCardBodyProps {
  form: ReturnType<typeof useSignUpForm>;
  context: SignUpContext | null;
  /** True while sign-up is followed by the age check; false in March. */
  includesAgeCheck: boolean;
}

/**
 * Renders the form or the next step.
 *
 * @returns the form, the age refusal, or CheckYourEmail
 */
export function SignUpCardBody({ form, context, includesAgeCheck }: SignUpCardBodyProps) {
  if (form.refusal !== null) {
    return (
      <AgeRefusal
        reason={form.refusal.reason}
        country={form.refusal.country}
        minimumAge={form.refusal.age}
      />
    );
  }
  if (form.sentTo === null) return <SignUpForm form={form} includesAgeCheck={includesAgeCheck} />;

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
      joinsWaitlist={form.joinsWaitlist}
    />
  );
}
