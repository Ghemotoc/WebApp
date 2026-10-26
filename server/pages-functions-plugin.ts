/**
 * Serves our Cloudflare Pages Functions from Vite's own servers, so `npm run dev`,
 * `npm run preview` and the end-to-end tests behave like Cloudflare (story S1-E2-01).
 *
 * Who uses it: vite.config.ts. It never runs in production: Cloudflare runs functions/ itself.
 * Routes: POST /api/password-check (server/password-check.ts), GET /api/signup-context
 * (server/signup-context.ts, S1-E2-10), POST /api/contact (server/contact.ts, S1-E14-04),
 * POST /api/decision-emails (server/decision-emails.ts, S1-E10-04),
 * POST /api/notice (server/notice.ts, S1-E10-02: signed with NOTICE_SECRET, the same value the
 * tests put in the local Vault; its emails go to Mailpit too) and
 * GET /s/… (server/link-preview.ts, S1-E4-04: the shared link's Open Graph tags, read from the
 * local Supabase with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, as on Cloudflare).
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
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';

import { loadEnv, type Connect, type Plugin } from 'vite';

import { brandDefaults } from '../src/config/brand.ts';

import { handleContact, sendWithMailpit } from './contact.ts';
import { handleDecisionEmails } from './decision-emails.ts';
import { fetchLinkPreview, handleSharedLink, parseSharedAddress } from './link-preview.ts';
import { handleNotice } from './notice.ts';
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

/** How each server reads the app's index.html: the dev server builds it, preview reads dist/. */
type ReadIndexHtml = (url: string) => Promise<string>;

/**
 * The handler for a shared story or chapter address, with the local Supabase as the database.
 *
 * @param readIndexHtml - how this server reads index.html
 * @param environment - the VITE_ values (the shell's win over the .env files, as in Vite)
 * @returns the function that answers GET /s/…
 */
function sharedLinkHandler(readIndexHtml: ReadIndexHtml, environment: Record<string, string>) {
  return (request: Request) =>
    handleSharedLink(request, {
      fetchIndexHtml: async () =>
        new Response(await readIndexHtml(new URL(request.url).pathname), {
          headers: { 'Content-Type': 'text/html' },
        }),
      findPreview: (address) =>
        fetchLinkPreview(
          {
            supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
            anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
          },
          address,
        ),
    });
}

/**
 * Picks the handler for an address, or none.
 *
 * @param url - the request's address
 * @param sharedLink - the shared-link handler for this server
 * @param environment - the VITE_ values, for the functions that read the database
 * @returns the function that answers it, or null for every other address
 */
function handlerFor(
  url: string | undefined,
  sharedLink: (request: Request) => Promise<Response>,
  environment: Record<string, string>,
): ((request: Request) => Promise<Response>) | null {
  // A shared story or chapter (S1-E4-04); the query, if any, is ignored as on Cloudflare.
  if (parseSharedAddress((url ?? '').split('?')[0] ?? '') !== null) return sharedLink;
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
  if (url === '/api/notice') {
    // The public report form (S1-E10-02): the local Supabase, the local secret, Mailpit.
    return (request) =>
      handleNotice(request, {
        supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
        anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
        secret: process.env.NOTICE_SECRET,
        supportEmail: process.env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
        productName: process.env.VITE_BRAND_NAME ?? brandDefaults.productName,
        sendEmail: sendWithMailpit('http://127.0.0.1:54324/api/v1'),
      });
  }
  if (url === '/api/decision-emails') {
    // The decision emails after a case is decided (S1-E10-04): the local Supabase, Mailpit.
    return (request) =>
      handleDecisionEmails(request, {
        supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
        anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
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
 * @param sharedLink - the shared-link handler for this server
 * @param environment - the VITE_ values, passed on to handlerFor()
 * @returns Connect middleware for Vite's dev and preview servers
 */
function pagesFunctionsMiddleware(
  sharedLink: (request: Request) => Promise<Response>,
  environment: Record<string, string>,
): Connect.NextHandleFunction {
  return (request, response, next) => {
    // Only page loads: the app's own files and data calls under /s/ don't exist, but be safe.
    if (request.method !== 'GET' && request.url?.startsWith('/s/')) return next();
    const handler = handlerFor(request.url, sharedLink, environment);
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
  // The VITE_ values, read when Vite knows its mode: .env files first, the shell's on top.
  let environment: Record<string, string> = {};
  return {
    name: 'pages-functions',
    configResolved: (config) => {
      const fromShell = Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      );
      environment = {
        ...loadEnv(config.mode, config.envDir || process.cwd(), 'VITE_'),
        ...fromShell,
      };
    },
    configureServer: (server) => {
      // The dev server builds index.html on the fly, with its own scripts in it.
      const readIndexHtml: ReadIndexHtml = async (url) =>
        server.transformIndexHtml(
          url,
          await readFile(resolve(server.config.root, 'index.html'), 'utf8'),
        );
      server.middlewares.use(
        pagesFunctionsMiddleware(sharedLinkHandler(readIndexHtml, environment), environment),
      );
    },
    configurePreviewServer: (server) => {
      // Preview serves the production build, as Cloudflare does.
      const outDir = resolve(server.config.root, server.config.build.outDir);
      const readIndexHtml: ReadIndexHtml = () => readFile(resolve(outDir, 'index.html'), 'utf8');
      server.middlewares.use(
        pagesFunctionsMiddleware(sharedLinkHandler(readIndexHtml, environment), environment),
      );
    },
  };
}
