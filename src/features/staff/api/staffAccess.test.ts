/**
 * Unit tests for reading my_staff_sign_in()'s answer (story S1-E2-07b).
 *
 * Who runs it: `npm test`.
 * What it proves: the admin shell shows the Google Workspace page only when the server asks for
 * it and names a domain; anything unexpected counts as "not needed", because the server refuses
 * staff actions on its own whatever the screen shows.
 */
import { describe, expect, it } from 'vitest';

import { toWorkspaceSignIn } from './staffAccess';

describe('toWorkspaceSignIn', () => {
  it('asks a staff member who isn’t connected yet to connect their Workspace account', () => {
    expect(
      toWorkspaceSignIn({ needs_workspace: true, domain: 'example.com', connected: false }),
    ).toEqual({ isNeeded: true, domain: 'example.com', isConnected: false });
  });

  it('only asks a connected staff member to sign in with Google', () => {
    expect(
      toWorkspaceSignIn({ needs_workspace: true, domain: 'example.com', connected: true }),
    ).toEqual({ isNeeded: true, domain: 'example.com', isConnected: true });
  });

  it('asks nothing of a member or of staff who already signed in with Google', () => {
    expect(toWorkspaceSignIn({ needs_workspace: false, domain: null, connected: false })).toEqual({
      isNeeded: false,
      domain: null,
      isConnected: false,
    });
  });

  it('asks nothing when the answer is missing or names no domain', () => {
    expect(toWorkspaceSignIn(null).isNeeded).toBe(false);
    expect(toWorkspaceSignIn({ needs_workspace: true, domain: '' }).isNeeded).toBe(false);
    expect(toWorkspaceSignIn('unexpected').isNeeded).toBe(false);
  });
});
