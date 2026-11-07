/**
 * Tests for the sign-up data the trigger reads (api/signUp.ts), with the waiting list's part
 * (WAITLIST-1).
 */
import { describe, expect, it } from 'vitest';

import { signUpData, type SignUpContext, type SignUpDataAnswers } from './signUp';

/** A form's answers with the waiting list's question answered. */
const answers: SignUpDataAnswers = {
  birthYear: '1990',
  birthMonth: '',
  handle: 'new.writer',
  country: 'RO',
  legalRegion: '',
  waitlistInterest: 'read',
  newsEmails: false,
};

/** What else the form sends; the switch and the code vary by test. */
function contextWith(isWaitlistOn: boolean, inviteCode: string | null): SignUpContext {
  return {
    inviteCode,
    termsVersionId: 'terms',
    privacyVersionId: 'privacy',
    locale: 'en',
    signupToken: null,
    signupIpToken: null,
    country: null,
    ageRules: [],
    isWaitlistOn,
  };
}

describe('signUpData', () => {
  it('sends nothing about the waiting list while it is off', () => {
    const data = signUpData(answers, contextWith(false, 'GOOD'));
    expect(data).not.toHaveProperty('waitlist_interest');
    expect(data).not.toHaveProperty('joins_waitlist');
  });

  it('sends the answer, the news choice and that the person joins the list without a code', () => {
    expect(signUpData(answers, contextWith(true, null))).toMatchObject({
      waitlist_interest: 'read',
      news_emails: 'false',
      joins_waitlist: true,
    });
  });

  it('says a person with a code doesn’t join the list, so the email isn’t "You’re on the list"', () => {
    expect(signUpData(answers, contextWith(true, 'GOOD'))).toMatchObject({ joins_waitlist: false });
  });
});
