/**
 * Tests for scrubbing error text before it leaves the browser (story S1-E1-05: "no email, IP
 * address or user content is included"). The database's own copy of the rules is tested in
 * supabase/tests/database/029-client-errors.test.sql.
 */
import { describe, expect, it } from 'vitest';

import { scrubErrorText } from './scrubErrorText';

describe('scrubErrorText', () => {
  it('removes an email address', () => {
    expect(scrubErrorText('No account for ana.pop@example.com', 500)).toBe(
      'No account for [email]',
    );
  });

  it('removes a web address with its query string', () => {
    expect(scrubErrorText('Failed to fetch https://x.test/reset?code=abc now', 500)).toBe(
      'Failed to fetch [url] now',
    );
  });

  it('removes text in quotes, which is often what someone typed', () => {
    expect(scrubErrorText('Invalid value "my secret poem" for title', 500)).toBe(
      'Invalid value [text] for title',
    );
    expect(scrubErrorText("Cannot read properties of undefined (reading 'title')", 500)).toBe(
      'Cannot read properties of undefined (reading [text])',
    );
  });

  it('keeps the apostrophe in a word', () => {
    expect(scrubErrorText("can't reach the server", 500)).toBe("can't reach the server");
  });

  it('removes IDs, signed tokens, long keys and long numbers', () => {
    const scrubbed = scrubErrorText(
      'user 0f8fad5b-d9cb-469f-a165-70867728950e token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln key sk_live_ABCDEFGHIJKLMNOPQRSTUVWX phone 0722123456',
      500,
    );
    expect(scrubbed).toBe('user [id] token [token] key [token] phone [number]');
  });

  it('trims the text to the limit', () => {
    expect(scrubErrorText('word '.repeat(150), 500)).toHaveLength(500);
  });
});
