/** Tests for the email hash used by the log-in pause (story S1-E2-05). */
import { describe, expect, it } from 'vitest';

import { hashEmail } from './emailHash';

describe('the email hash', () => {
  it('is the SHA-256 of the email in lower case, like the database’s hash_email()', async () => {
    // The same value Postgres gives for encode(digest('abc', 'sha256'), 'hex').
    expect(await hashEmail('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('ignores letter case and spaces at either end, so typing differences don’t matter', async () => {
    expect(await hashEmail(' Lia@Example.com ')).toBe(await hashEmail('lia@example.com'));
  });
});
