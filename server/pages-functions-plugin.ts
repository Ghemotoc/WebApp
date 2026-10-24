/**
 * Serves our Cloudflare Pages Functions from Vite's own servers, so `npm run dev`,
 * `npm run preview` and the end-to-end tests behave like Cloudflare (story S1-E2-01).
 *
 * Who uses it: vite.config.ts. It never runs in production: Cloudflare runs functions/ itself.
 * Routes: POST /api/password-check (server/password-check.ts), GET /api/signup-context
 * (server/signup-context.ts, S1-E2-10) and POST /api/contact (server/contact.ts, S1-E14-04).
 * Stand-ins:
 * - with PASSWORD_CHECK_STUB=1 (set by playwright.config.ts) the leaked-password check answers
 *   from a fixed list instead of the internet, so tests don't depend on an outside service: the
 *   one leaked password is "Password1234";
 * - there is no Cloudflare locally, so the country is LOCAL_FAKE_COUNTRY (Romania when unset; any
 *   other value, for example "XX" for unknown, to try another country; end-to-end tests send an
 *   X-Fake-Country header instead) and the token is signed
 *   with SIGNUP_CONTEXT_SECRET from the environment (none: no token, as on a site without it);
 * - the Contact us form's emails go into Mailpit, the local Supabase's mail catcher
 *   (http://127.0.0.1:54324), instead of Brevo, so they can be read locally and by the tests.
 */
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Connect, Plugin } from 'vite';

import { brandDefaults } from '../src/config/brand.ts';

import { handleContact, sendWithMailpit } from './contact.ts';
import { handleSignupContext } from './signup-context.ts';
import {
  fetchFromHaveIBeenPwned,
  handlePasswordCheck,
  type FetchPasswordRange,
} from './password-check.ts';

/** The password the stand-in reports as leaked. */
export const stubLeakedPassword = 'Password1234';

/**
 * The stand-in range service: lists the leaked password's hash under its prefix, with padding.
 *
 * @param prefix - 5 hexadecimal characters
 * @returns a range list in the service's format
 */
const fetchFromStub: FetchPasswordRange = async (prefix) => {
  const leakedHash = createHash('sha1').update(stubLeakedPassword).digest('hex').toUpperCase();
  const lines = ['0000000000000000000000000000000000A:0'];
  if (leakedHash.startsWith(prefix)) lines.push(`${leakedHash.slice(5)}:42`);
  return new Response(lines.join('\r\n'));
};

/**
 * Turns Node's request into a web Request, as Cloudflare hands one to a function.
 *
 * @param nodeRequest - the dev server's request
 * @returns the same request as a web Request
 */
async function toWebRequest(nodeRequest: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of nodeRequest) chunks.push(chunk as Buffer);
  return new Request(`http://localhost${nodeRequest.url ?? '/'}`, {
    method: nodeRequest.method,
    headers: nodeRequest.headers as Record<string, string>,
    body: nodeRequest.method === 'GET' ? undefined : Buffer.concat(chunks),
  });
}

/**
 * Sends a web Response back through Node's response.
 *
 * @param response - what the function answered
 * @param nodeResponse - the dev server's response
 */
async function sendWebResponse(response: Response, nodeResponse: ServerResponse): Promise<void> {
  nodeResponse.statusCode = response.status;
  response.headers.forEach((value, name) => nodeResponse.setHeader(name, value));
  nodeResponse.end(await response.text());
}

/**
 * Picks the handler for an address, or none.
 *
 * @param url - the request's address
 * @returns the function that answers it, or null for every other address
 */
function handlerFor(url: string | undefined): ((request: Request) => Promise<Response>) | null {
  if (url === '/api/password-check') {
    const fetchRange =
      process.env.PASSWORD_CHECK_STUB === '1' ? fetchFromStub : fetchFromHaveIBeenPwned;
    return (request) => handlePasswordCheck(request, fetchRange);
  }
  if (url === '/api/contact') {
    // The emails land in Mailpit locally; the brand values come from the same variables Cloudflare
    // has, with today's values as the fallback (src/config/brand.ts).
    return (request) =>
      handleContact(request, {
        supportEmail: process.env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
        productName: process.env.VITE_BRAND_NAME ?? brandDefaults.productName,
        sendEmail: sendWithMailpit('http://127.0.0.1:54324/api/v1'),
      });
  }
  if (url === '/api/signup-context') {
    // A test can ask for another country with the X-Fake-Country header; this file never runs on
    // Cloudflare, where only the real connection counts.
    return (request) =>
      handleSignupContext(request, {
        cloudflareCountry:
          request.headers.get('X-Fake-Country') ?? process.env.LOCAL_FAKE_COUNTRY ?? 'RO',
        secret: process.env.SIGNUP_CONTEXT_SECRET,
        now: new Date(),
      });
  }
  return null;
}

/**
 * The middleware that answers the functions' addresses.
 *
 * @returns Connect middleware for Vite's dev and preview servers
 */
function pagesFunctionsMiddleware(): Connect.NextHandleFunction {
  return (request, response, next) => {
    const handler = handlerFor(request.url);
    if (handler === null) return next();
    void toWebRequest(request)
      .then(handler)
      .then((webResponse) => sendWebResponse(webResponse, response))
      .catch(next);
  };
}

/**
 * The Vite plugin.
 *
 * @returns a plugin that adds the middleware to both the dev and the preview server
 */
export function pagesFunctionsPlugin(): Plugin {
  return {
    name: 'pages-functions',
    configureServer: (server) => {
      server.middlewares.use(pagesFunctionsMiddleware());
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(pagesFunctionsMiddleware());
    },
  };
}
