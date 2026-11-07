/**
 * Tests for the sign-up form's rules (story S1-E2-01, with the username from S1-E2-04).
 */
import { describe, expect, it } from 'vitest';

import { findSignUpProblems } from './signUp';

/** A complete, correct set of answers to change one thing at a time. */
const goodAnswers = {
  method: 'password',
  email: 'new.writer@example.com',
  handle: 'new.writer',
  password: 'a long passphrase',
  confirmPassword: 'a long passphrase',
  birthYear: '1990',
  birthMonth: '',
  country: 'RO',
  legalRegion: '',
  acceptsTerms: true,
  // The waiting list's question is '' until asked (WAITLIST-1); news emails are a separate opt-in.
  waitlistInterest: '',
  newsEmails: false,
};

describe('the sign-up rules', () => {
  it('asks for the country the person lives in (MARKETS-1)', () => {
    expect(findSignUpProblems({ ...goodAnswers, country: '' })).toEqual({
      country: 'signUp.errors.countryMissing',
    });
  });

  it('accepts complete answers', () => {
    expect(findSignUpProblems(goodAnswers)).toEqual({});
  });

  it('asks for at least 10 characters (canvas 2.1): 9 is too short', () => {
    expect(
      findSignUpProblems({ ...goodAnswers, password: '123456789', confirmPassword: '123456789' }),
    ).toEqual({ password: 'signUp.errors.passwordTooShort' });
  });

  it('asks for a username of at least 3 characters (S1-E2-04)', () => {
    expect(Object.keys(findSignUpProblems({ ...goodAnswers, handle: 'ab' }))).toEqual(['handle']);
  });

  it('asks for the same password twice', () => {
    expect(findSignUpProblems({ ...goodAnswers, confirmPassword: 'something else' })).toEqual({
      confirmPassword: 'signUp.errors.passwordsDiffer',
    });
  });

  it('needs no password when the person asks for an emailed link instead', () => {
    expect(
      findSignUpProblems({ ...goodAnswers, method: 'link', password: '', confirmPassword: '' }),
    ).toEqual({});
  });

  it('needs an email address, a year of birth and the terms accepted', () => {
    expect(
      findSignUpProblems({
        ...goodAnswers,
        email: 'not an email',
        birthYear: '',
        acceptsTerms: false,
      }),
    ).toEqual({
      email: 'signUp.errors.emailInvalid',
      birthYear: 'signUp.errors.birthYearMissing',
      acceptsTerms: 'signUp.errors.termsNotAccepted',
    });
  });

  it('asks for the month when the year leaves the age unclear at 13 or 16', () => {
    const thirteenThisYear = String(new Date().getFullYear() - 13);
    expect(findSignUpProblems({ ...goodAnswers, birthYear: thirteenThisYear })).toEqual({
      birthMonth: 'signUp.errors.birthMonthMissing',
    });
  });
});
