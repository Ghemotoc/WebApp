/**
 * Serves our Cloudflare Pages Functions from Vite's own servers, so `npm run dev`,
 * `npm run preview` and the end-to-end tests behave like Cloudflare (story S1-E2-01).
 *
 * Who uses it: vite.config.ts. It never runs in production: Cloudflare runs functions/ itself.
 * Routes: POST /api/password-check (server/password-check.ts), GET /api/signup-context
 * (server/signup-context.ts, S1-E2-10), POST /api/contact (server/contact.ts, S1-E14-04),
 * POST /api/decision-emails (server/decision-emails.ts, S1-E10-04),
 * POST /api/notification-emails and POST /api/unsubscribe (server/notification-emails.ts,
 * S1-E7-02: the worker key is EMAIL_WORKER_KEY, the seeded Vault value; emails go to Mailpit),
 * POST /api/notice (server/notice.ts, S1-E10-02: signed with NOTICE_SECRET, the same value the
 * tests put in the local Vault; its emails go to Mailpit too) and
 * POST /api/picture-check (server/picture-check.ts, S1-E10-05: always the stub locally, signed
 * with PICTURE_CHECK_SECRET, the same value the tests put in the local Vault),
 * POST /api/embed (server/embeds.ts, S1-E3-10: always the oEmbed stand-in locally, so nothing
 * leaves the machine),
 * /api/canva/… (server/canva.ts, S1-E3-12: always the Canva stand-in locally, with its own token
 * key),
 * /api/age-check/… (server/age-check.ts, S1-E2-08: always the Yoti stand-in locally, signed with
 * AGE_CHECK_SECRET, the same value the tests put in the local Vault),
 * /api/parent-consent/… (server/parent-consent.ts, S1-E2-03: signed with PARENTAL_CONSENT_SECRET,
 * the same value the tests put in the local Vault; the emails go to Mailpit),
 * /api/data-request-parent/… (server/data-request-parent.ts, ADMIN-2c3: the same secret and Mailpit),
 * /api/teacher-check/… (server/teacher-check.ts, S1-E2-11: signed with TEACHER_CHECK_SECRET, the
 * same value the tests put in the local Vault; the link goes to Mailpit) and
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

import { handleAgeCheck } from './age-check.ts';
import { handleCanva } from './canva.ts';
import { handleContact, sendWithMailpit } from './contact.ts';
import { handleDataRequestParent } from './data-request-parent.ts';
import { handleDecisionEmails } from './decision-emails.ts';
import { handleEmbed } from './embeds.ts';
import { oembedLookup } from './embeds/oembed.ts';
import { fetchLinkPreview, handleSharedLink, parseSharedAddress } from './link-preview.ts';
import { handleNotice } from './notice.ts';
import {
  handleNotificationEmails,
  handleUnsubscribe,
  type NotificationEmailOptions,
} from './notification-emails.ts';
import { handleParentConsent } from './parent-consent.ts';
import { handleTeacherCheck } from './teacher-check.ts';
import { handlePictureCheck } from './picture-check.ts';
import { pictureChecker } from './picture-check/index.ts';
import { overridesFromDatabase } from './send-email.ts';
import { handleSignupContext } from './signup-context.ts';
import { makeSignupIpToken } from './signup-ip.ts';
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
  // The bytes as they are: a picture (the Canva export, S1-E3-12) must not pass through text.
  nodeResponse.end(Buffer.from(await response.arrayBuffer()));
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

/** A handler that answers one function's address. */
type FunctionHandler = (request: Request) => Promise<Response>;

/**
 * The notification email worker's settings locally: the local Supabase, EMAIL_WORKER_KEY from the
 * environment (the seeded Vault value in the e2e tests), the bundled texts with the local
 * overrides, and Mailpit instead of Brevo.
 *
 * @param environment - the VITE_ values
 * @returns the options for handleNotificationEmails()
 */
function notificationEmailOptions(environment: Record<string, string>): NotificationEmailOptions {
  const supabaseUrl = environment.VITE_SUPABASE_URL ?? '';
  const anonKey = environment.VITE_SUPABASE_ANON_KEY ?? '';
  const productName = process.env.VITE_BRAND_NAME ?? brandDefaults.productName;
  return {
    supabaseUrl,
    anonKey,
    workerKey: process.env.EMAIL_WORKER_KEY,
    sender: {
      name: productName,
      email: process.env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    },
    productName,
    companyName: process.env.VITE_BRAND_COMPANY_NAME ?? brandDefaults.companyName,
    sendEmail: sendWithMailpit('http://127.0.0.1:54324/api/v1'),
    readOverrides: overridesFromDatabase(supabaseUrl, anonKey),
  };
}

/**
 * Picks the handler for the functions that read or write the local database.
 *
 * @param url - the request's address
 * @param environment - the VITE_ values: the local Supabase's address and anon key
 * @returns the function that answers it, or null for every other address
 */
function databaseHandlerFor(
  url: string | undefined,
  environment: Record<string, string>,
): FunctionHandler | null {
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
  if (url === '/api/picture-check') {
    // The picture check (S1-E10-05): the local Supabase and the stub, never the real services.
    return (request) =>
      handlePictureCheck(request, {
        supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
        anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
        secret: process.env.PICTURE_CHECK_SECRET,
        // Unset locally, so no IP address is kept (server/scrambled-ip.ts).
        ipSecret: process.env.IP_SCRAMBLE_SECRET,
        checkPicture: pictureChecker({
          mode: 'stub',
          sightengine: { apiUser: '', apiSecret: '' },
          arachnid: { username: '', password: '' },
        }),
      });
  }
  if (url === '/api/notification-emails') {
    // The notification emails (S1-E7-02): the local Supabase, the seeded worker key, Mailpit.
    return (request) => handleNotificationEmails(request, notificationEmailOptions(environment));
  }
  if ((url ?? '').startsWith('/api/unsubscribe')) {
    // The one-click unsubscribe from an email's header (S1-E7-02).
    return (request) =>
      handleUnsubscribe(request, {
        supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
        anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
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
  return null;
}

/**
 * The request at this server's real address: toWebRequest() always says "localhost", but the
 * Canva stand-in's pages link back to our own pages, so they need the port too.
 *
 * @param request - the request as toWebRequest() made it
 * @returns the same request at http://<Host header>
 */
function withLocalOrigin(request: Request): Request {
  const address = new URL(request.url);
  const host = request.headers.get('host') ?? 'localhost';
  return new Request(`http://${host}${address.pathname}${address.search}`, request);
}

/**
 * The Canva handler's settings locally: the local Supabase and always the stand-in (S1-E3-12).
 *
 * @param environment - the VITE_ values
 * @returns the options for handleCanva()
 */
function canvaOptions(environment: Record<string, string>) {
  return {
    supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
    anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
    tokenSecret: undefined,
    settings: { mode: 'stub' },
  };
}

/**
 * Picks the handler for the functions that stand in for an outside service locally (oEmbed for
 * music and video, Canva for covers, Yoti for the age check), so nothing leaves the machine, then
 * the ones that email a signed link (signedLinkHandlerFor()).
 *
 * @param url - the request's address
 * @param environment - the VITE_ values: the local Supabase's address and anon key
 * @returns the function that answers it, or null for every other address
 */
function outsideServiceHandlerFor(
  url: string | undefined,
  environment: Record<string, string>,
): FunctionHandler | null {
  if (url === '/api/embed') {
    // Music and video cards (S1-E3-10): the local Supabase and the oEmbed stand-in.
    return (request) =>
      handleEmbed(request, {
        supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
        anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
        lookUpOembed: oembedLookup('stub'),
      });
  }
  if ((url ?? '').startsWith('/api/canva/')) {
    // Design it in Canva (S1-E3-12): the local Supabase and the stand-in, never Canva itself.
    return (request) => handleCanva(withLocalOrigin(request), canvaOptions(environment));
  }
  if ((url ?? '').startsWith('/api/age-check/')) {
    // The age check (S1-E2-08): the local Supabase, the local secret and always the Yoti stand-in.
    return (request) =>
      handleAgeCheck(withLocalOrigin(request), {
        supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
        anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
        secret: process.env.AGE_CHECK_SECRET,
        settings: { mode: 'stub' },
      });
  }
  // The functions that email a signed link come last.
  return signedLinkHandlerFor(url, environment);
}

/**
 * Picks the handler for the functions that email a signed link (parental consent, a data
 * request's parent path, the Teacher badge's school address): the local secrets the tests put in
 * the local Vault, and Mailpit's inbox instead of Brevo.
 *
 * @param url - the request's address
 * @param environment - the VITE_ values: the local Supabase's address and anon key
 * @returns the function that answers it, or null for every other address
 */
function signedLinkHandlerFor(
  url: string | undefined,
  environment: Record<string, string>,
): FunctionHandler | null {
  if ((url ?? '').startsWith('/api/parent-consent/')) {
    // Parental consent (S1-E2-03): the local Supabase, the local secret and Mailpit's inbox.
    return (request) =>
      handleParentConsent(withLocalOrigin(request), {
        ...notificationEmailOptions(environment),
        secret: process.env.PARENTAL_CONSENT_SECRET,
      });
  }
  if ((url ?? '').startsWith('/api/data-request-parent/')) {
    // A data request's parent path (ADMIN-2c3): the same secret as parental consent, and Mailpit.
    return (request) =>
      handleDataRequestParent(withLocalOrigin(request), {
        ...notificationEmailOptions(environment),
        secret: process.env.PARENTAL_CONSENT_SECRET,
      });
  }
  if ((url ?? '').startsWith('/api/teacher-check/')) {
    // The Teacher badge's school email link (S1-E2-11): the local secret and Mailpit's inbox.
    return (request) =>
      handleTeacherCheck(withLocalOrigin(request), {
        ...notificationEmailOptions(environment),
        secret: process.env.TEACHER_CHECK_SECRET,
      });
  }
  return null;
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
        // Support tickets (S1-E11-13): the local Supabase and the local secret.
        tickets: {
          supabaseUrl: environment.VITE_SUPABASE_URL ?? '',
          anonKey: environment.VITE_SUPABASE_ANON_KEY ?? '',
          secret: process.env.SUPPORT_TICKET_SECRET,
        },
        sendEmail: sendWithMailpit('http://127.0.0.1:54324/api/v1'),
      });
  }
  const databaseHandler = databaseHandlerFor(url, environment);
  if (databaseHandler !== null) return databaseHandler;
  const outsideServiceHandler = outsideServiceHandlerFor(url, environment);
  if (outsideServiceHandler !== null) return outsideServiceHandler;
  if (url === '/api/signup-context') {
    // A test can ask for another country with the X-Fake-Country header; this file never runs on
    // Cloudflare, where only the real connection counts.
    // A test can send CF-Connecting-IP itself to stand in for Cloudflare's address (part f2).
    return async (request) => {
      const now = new Date();
      const ipToken = await makeSignupIpToken(request, {
        scrambleSecret: process.env.IP_SCRAMBLE_SECRET,
        signingSecret: process.env.SIGNUP_CONTEXT_SECRET,
        now,
      });
      return handleSignupContext(request, {
        cloudflareCountry:
          request.headers.get('X-Fake-Country') ?? process.env.LOCAL_FAKE_COUNTRY ?? 'RO',
        secret: process.env.SIGNUP_CONTEXT_SECRET,
        now,
        ipToken,
      });
    };
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
