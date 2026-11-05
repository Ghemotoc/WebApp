/**
 * Unit tests for the security headers (QA-1c, finding X1). The end-to-end check that the pages
 * really work under them is e2e/security-headers.spec.ts.
 */
import { describe, expect, it } from 'vitest';

import {
  cloudflareHeadersFile,
  contentSecurityPolicy,
  securityHeaders,
  supabaseOrigins,
  withSecurityHeaders,
} from './security-headers';

/** A policy split into its directives, by name. */
function directivesOf(policy: string): Map<string, string[]> {
  return new Map(
    policy.split('; ').map((directive) => {
      const [name = '', ...sources] = directive.split(' ');
      return [name, sources];
    }),
  );
}

describe('security headers', () => {
  it('lets the app reach its own Supabase project over https and wss', () => {
    expect(supabaseOrigins('https://abc.supabase.co/')).toEqual([
      'https://abc.supabase.co',
      'wss://abc.supabase.co',
    ]);
    expect(supabaseOrigins('http://127.0.0.1:54321')).toEqual([
      'http://127.0.0.1:54321',
      'ws://127.0.0.1:54321',
    ]);
  });

  it('leaves Supabase out when the address is missing, rather than failing the build', () => {
    expect(supabaseOrigins('')).toEqual([]);
  });

  it('allows no inline script and no eval, and no framing of our pages', () => {
    const directives = directivesOf(contentSecurityPolicy('https://abc.supabase.co'));
    const scripts = directives.get('script-src') ?? [];
    expect(scripts).toContain("'self'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
  });

  it('allows the Supabase project for data and pictures', () => {
    const directives = directivesOf(contentSecurityPolicy('https://abc.supabase.co'));
    expect(directives.get('connect-src')).toContain('wss://abc.supabase.co');
    expect(directives.get('img-src')).toContain('https://abc.supabase.co');
  });

  it('allows the reviewed music and video players in frames (ADR 0008)', () => {
    const frames = directivesOf(contentSecurityPolicy('')).get('frame-src') ?? [];
    expect(frames).toContain('https://www.youtube-nocookie.com');
    expect(frames).toContain('https://open.spotify.com');
  });

  it('sends nosniff, a referrer policy and no tracking permissions', () => {
    const headers = securityHeaders('');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('browsing-topics=()');
  });

  it('writes a Cloudflare _headers file that covers every address', () => {
    const file = cloudflareHeadersFile('https://abc.supabase.co');
    expect(file.split('\n')).toContain('/*');
    expect(file).toContain('  Content-Security-Policy: default-src');
  });

  it('adds the headers to a function’s answer and keeps its status and body', async () => {
    const answer = withSecurityHeaders(
      new Response('<p>hi</p>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
      'https://abc.supabase.co',
    );
    expect(answer.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(answer.headers.get('Content-Type')).toBe('text/html');
    expect(await answer.text()).toBe('<p>hi</p>');
  });
});
