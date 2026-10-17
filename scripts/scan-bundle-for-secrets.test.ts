/**
 * Tests for the bundle secret scan (story S1-E1-02).
 * Proves "Given the client app, when its bundle is scanned in CI, then it contains no service role
 * key": the scan catches each kind of secret and lets the public anon key through. CI runs the
 * scan itself on the real dist/ after the build (`npm run scan:bundle`).
 */
import { describe, expect, it } from 'vitest';

import { findSecretsInText, isServiceRoleToken } from './scan-bundle-for-secrets';

/**
 * Builds a fake, unsigned token with the given role, shaped like a Supabase key.
 *
 * @param role - the role to put in the payload
 * @returns header.payload.signature text
 */
function fakeToken(role: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'supabase', role })}.c2lnbmF0dXJl`;
}

describe('the bundle secret scan', () => {
  it('finds a service role token in a bundled file', () => {
    const bundledCode = `const key="${fakeToken('service_role')}";`;

    expect(findSecretsInText(bundledCode, 'assets/index.js')).toEqual([
      { filePath: 'assets/index.js', reason: 'a service role JSON web token' },
    ]);
  });

  it('lets the public anon key through, because it is meant for browsers', () => {
    const bundledCode = `const key="${fakeToken('anon')}";`;

    expect(findSecretsInText(bundledCode, 'assets/index.js')).toEqual([]);
  });

  it('finds a newer sb_secret_ key', () => {
    expect(findSecretsInText('k="sb_secret_abcdefgh12345678"', 'a.js')).toHaveLength(1);
  });

  it('finds the service role variable name, a sign of bundled server code', () => {
    expect(findSecretsInText('process.env.SUPABASE_SERVICE_ROLE_KEY', 'a.js')).toHaveLength(1);
  });

  it('ignores text that only looks like a token', () => {
    expect(isServiceRoleToken('eyJnot.eyJvalid.json')).toBe(false);
  });
});
