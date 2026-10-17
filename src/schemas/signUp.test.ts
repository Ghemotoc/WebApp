/**
 * Tests for the sign-up form's rules (story S1-E2-01).
 */
import { describe, expect, it } from 'vitest';

import { findSignUpProblems } from './signUp';

/** A complete, correct set of answers to change one thing at a time. */
const goodAnswers = {
  method: 'password',
  email: 'new.writer@example.com',
  password: 'a long passphrase',
  confirmPassword: 'a long passphrase',
  birthYear: '1990',
  acceptsTerms: true,
};

describe('the sign-up rules', () => {
  it('accepts complete answers', () => {
    expect(findSignUpProblems(goodAnswers)).toEqual({});
  });

  it('asks for at least 10 characters (canvas 2.1): 9 is too short', () => {
    expect(
      findSignUpProblems({ ...goodAnswers, password: '123456789', confirmPassword: '123456789' }),
    ).toEqual({ password: 'signUp.errors.passwordTooShort' });
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
});
