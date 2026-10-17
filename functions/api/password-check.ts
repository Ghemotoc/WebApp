/**
 * Cloudflare Pages Function at /api/password-check (story S1-E2-01; ADR 0003).
 *
 * Cloudflare Pages runs every file under functions/ as a route next to the built site, on
 * staging and production. The logic lives in server/password-check.ts, which local development
 * and the tests share; this file only connects it to the real Have I Been Pwned range service.
 */
import { fetchFromHaveIBeenPwned, handlePasswordCheck } from '../../server/password-check';

/**
 * Answers POST /api/password-check.
 *
 * @param context - Cloudflare's request context; only the request is used
 * @returns the range list, or an error status (see handlePasswordCheck)
 */
export const onRequestPost = (context: { request: Request }): Promise<Response> =>
  handlePasswordCheck(context.request, fetchFromHaveIBeenPwned);
