/**
 * Unit tests for the Google, Apple and Microsoft return page's decisions (story S1-E2-09).
 * Who runs it: `npm test`. Supabase is a small fake, so these tests check only the order of the
 * cases in socialReturn.ts; the database rules behind finish_social_sign_up() are pgTAP test 203.
 */
import { afterEach, describe, expect, it } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  messageForError,
  readSocialReturnAddress,
  settleSocialReturn,
  type SocialReturnAddress,
} from './socialReturn';

/** An address with no mode and no error. */
const plainReturn: SocialReturnAddress = { mode: null, errorCode: null, errorDescription: null };

/**
 * A fake client: signed in or not, answering the two database functions as told.
 *
 * @param options - the session, finish_social_sign_up()'s answer and cancel_social_sign_up()'s error code
 * @returns the fake and the database functions it was asked to run
 */
function fakeClient(options: { isSignedIn: boolean; finish?: unknown; cancelErrorCode?: string }) {
  const called: string[] = [];
  const client = {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: options.isSignedIn ? { user: {} } : null } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    rpc: (name: string) => {
      called.push(name);
      if (name === 'finish_social_sign_up')
        return Promise.resolve({ data: options.finish, error: null });
      const error =
        options.cancelErrorCode === undefined
          ? null
          : { code: options.cancelErrorCode, message: 'no' };
      return Promise.resolve({ data: null, error });
    },
  };
  return { client: client as unknown as AppSupabaseClient, called };
}

afterEach(() => window.sessionStorage.clear());

describe('the social return page', () => {
  it('reads an error from after the # as well as from the query', () => {
    const address = readSocialReturnAddress({
      search: '?mode=link',
      hash: '#error=server_error&error_description=identity_link_not_requested%3A+log+in',
    });
    expect(address).toEqual({
      mode: 'link',
      errorCode: 'server_error',
      errorDescription: 'identity_link_not_requested: log in',
    });
  });

  it('says the email already has an account when the database refused to join them', () => {
    expect(
      messageForError({ ...plainReturn, errorDescription: 'identity_link_not_requested: …' }),
    ).toBe('alreadyHasAccount');
    expect(messageForError({ ...plainReturn, errorCode: 'access_denied' })).toBe('cancelled');
    expect(messageForError({ ...plainReturn, errorCode: 'identity_already_exists' })).toBe(
      'linkTaken',
    );
  });

  it('drops kept answers after an error, so they are never used twice', async () => {
    window.sessionStorage.setItem('social-sign-up-answers', '{"handle":"ana"}');
    const { client } = fakeClient({ isSignedIn: true });
    const outcome = await settleSocialReturn(client, {
      ...plainReturn,
      errorCode: 'access_denied',
    });
    expect(outcome).toEqual({ kind: 'say', message: 'cancelled' });
    expect(window.sessionStorage.getItem('social-sign-up-answers')).toBeNull();
  });

  it('finishes a sign-up with the kept answers and goes home', async () => {
    window.sessionStorage.setItem('social-sign-up-answers', '{"handle":"ana"}');
    const { client, called } = fakeClient({ isSignedIn: true, finish: { outcome: 'ok' } });
    expect(await settleSocialReturn(client, plainReturn)).toEqual({ kind: 'go', to: '/' });
    expect(called).toEqual(['finish_social_sign_up']);
  });

  it('cancels the account when a sign-up rule refuses, and says which rule', async () => {
    window.sessionStorage.setItem('social-sign-up-answers', '{"handle":"ana"}');
    const { client, called } = fakeClient({
      isSignedIn: true,
      finish: { outcome: 'refused', rule: 'age' },
    });
    expect(await settleSocialReturn(client, plainReturn)).toEqual({ kind: 'refused', rule: 'age' });
    expect(called).toEqual(['finish_social_sign_up', 'cancel_social_sign_up']);
  });

  it('asks someone who never joined to join first', async () => {
    const { client } = fakeClient({ isSignedIn: true });
    expect(await settleSocialReturn(client, plainReturn)).toEqual({
      kind: 'say',
      message: 'notJoined',
    });
  });

  it('lets an account that is set up go home', async () => {
    const { client } = fakeClient({ isSignedIn: true, cancelErrorCode: '23514' });
    expect(await settleSocialReturn(client, plainReturn)).toEqual({ kind: 'go', to: '/' });
  });

  it('goes back to Settings after connecting from there', async () => {
    const { client } = fakeClient({ isSignedIn: true });
    expect(await settleSocialReturn(client, { ...plainReturn, mode: 'link' })).toEqual({
      kind: 'go',
      to: '/settings#ways-to-log-in',
    });
  });
});
