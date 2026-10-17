/**
 * Guards the seed files against real people's data (story S1-E1-01).
 * Proves, as far as a test can, the acceptance criterion "the staging database holds synthetic data
 * only and never a copy of production": every email address in a seed file must use a domain that
 * can never belong to a real person (RFC 2606 reserves example.com, example.org, example.net and .test).
 * The rule itself is written at the top of supabase/seed.sql.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** Reserved domains that can never be a real mailbox. */
const reservedEmailDomain = /@([a-z0-9-]+\.)*(example\.(com|org|net)|[a-z0-9-]+\.test)$/i;

/** Anything that looks like an email address. */
const emailAddress = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Lists email addresses in a text that don't use a reserved test domain.
 *
 * @param text - the contents of a seed file
 * @returns the addresses that could belong to a real person
 */
function findRealLookingEmails(text: string): string[] {
  return (text.match(emailAddress) ?? []).filter((address) => !reservedEmailDomain.test(address));
}

describe('seed data', () => {
  it('uses only reserved test email domains in every supabase seed file', () => {
    const supabaseFolder = fileURLToPath(new URL('../supabase', import.meta.url));
    const seedFiles = readdirSync(supabaseFolder).filter((name) => /^seed.*\.sql$/.test(name));

    const realLooking = seedFiles.flatMap((fileName) =>
      findRealLookingEmails(readFileSync(join(supabaseFolder, fileName), 'utf8')),
    );

    expect(seedFiles.length).toBeGreaterThan(0);
    expect(realLooking).toEqual([]);
  });

  it('would flag a real-looking email address', () => {
    expect(findRealLookingEmails("insert into x values ('ana.pop@gmail.com');")).toEqual([
      'ana.pop@gmail.com',
    ]);
  });

  it('accepts persona addresses on reserved domains', () => {
    expect(findRealLookingEmails("'adult_writer@example.com', 'teen_17@personas.test'")).toEqual(
      [],
    );
  });
});
