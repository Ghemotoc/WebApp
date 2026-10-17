/**
 * Reads the emails the local Supabase sends, from Mailpit (story S1-E2-01).
 *
 * Who calls it: end-to-end tests that need a link from an email (confirmation, log-in, password
 * reset). Mailpit is the local Supabase's mail catcher (http://127.0.0.1:54324); nothing is ever
 * sent to a real inbox. CI starts it with the rest of Supabase (.github/workflows/ci.yml).
 */

/** Mailpit's web API on the local Supabase stack. */
const mailpitUrl = 'http://127.0.0.1:54324/api/v1';

/** The parts of a Mailpit message the tests read. */
interface MailpitMessage {
  Subject: string;
  HTML: string;
}

/**
 * Waits for the newest email to an address and returns it.
 *
 * @param address - the recipient
 * @param timeoutMs - how long to wait (emails arrive within a second or two)
 * @returns the email's subject and HTML
 * Errors: throws when no email arrives in time, naming the address.
 */
export async function waitForEmail(address: string, timeoutMs = 15_000): Promise<MailpitMessage> {
  const giveUpAt = Date.now() + timeoutMs;
  while (Date.now() < giveUpAt) {
    const search = await fetch(
      `${mailpitUrl}/search?query=${encodeURIComponent(`to:"${address}"`)}`,
    );
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    const newest = messages[0];
    if (newest !== undefined) {
      const message = await fetch(`${mailpitUrl}/message/${newest.ID}`);
      return (await message.json()) as MailpitMessage;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email reached ${address} in Mailpit.`);
}

/**
 * Finds the app address in an email's button (the part after the site address), so the test can
 * open it on the preview server.
 *
 * @param html - the email's HTML
 * @returns for example "/auth/confirm?token_hash=…&type=email"
 * Errors: throws when the email has no such link.
 */
export function appPathFromEmail(html: string): string {
  const match = /href="[^"]*?(\/auth\/[^"]+)"/.exec(html);
  if (match?.[1] === undefined) throw new Error('The email has no /auth/ link.');
  return match[1].replaceAll('&amp;', '&');
}
