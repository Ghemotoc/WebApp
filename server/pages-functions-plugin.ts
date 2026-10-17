/**
 * Serves our Cloudflare Pages Functions from Vite's own servers, so `npm run dev`,
 * `npm run preview` and the end-to-end tests behave like Cloudflare (story S1-E2-01).
 *
 * Who uses it: vite.config.ts. It never runs in production: Cloudflare runs functions/ itself.
 * Routes today: POST /api/password-check (server/password-check.ts). S1-E2-10 adds
 * /api/signup-context.
 * Stand-in: with PASSWORD_CHECK_STUB=1 (set by playwright.config.ts) the leaked-password check
 * answers from a fixed list instead of the internet, so tests don't depend on an outside service:
 * the one leaked password is "Password1234".
 */
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Connect, Plugin } from 'vite';

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
 * The middleware that answers /api/password-check.
 *
 * @returns Connect middleware for Vite's dev and preview servers
 */
function pagesFunctionsMiddleware(): Connect.NextHandleFunction {
  const fetchRange =
    process.env.PASSWORD_CHECK_STUB === '1' ? fetchFromStub : fetchFromHaveIBeenPwned;
  return (request, response, next) => {
    if (request.url !== '/api/password-check') return next();
    void toWebRequest(request)
      .then((webRequest) => handlePasswordCheck(webRequest, fetchRange))
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
