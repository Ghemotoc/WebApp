/**
 * Tests for the visitor's "I'm 18 or over" answer (bundle CALM-9m; src/lib/visitorAdult.ts).
 * Who runs it: `npm test`. What it proves: nothing is sent before the answer, the header goes
 * with every request after it, and the answer is kept in this browser.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchWithVisitorAdult,
  hasVisitorSaidAdult,
  rememberVisitorSaidAdult,
  resetVisitorAdultForTests,
  VISITOR_ADULT_STORAGE_KEY,
} from './visitorAdult';

/** A stand-in for fetch that records the headers it was given. */
function recordingSend() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    return Promise.resolve(new Response('{}'));
  });
}

afterEach(() => {
  localStorage.removeItem(VISITOR_ADULT_STORAGE_KEY);
  resetVisitorAdultForTests();
});

describe('a visitor’s “I’m 18 or over” answer', () => {
  it('sends no header before the visitor answers', async () => {
    const send = recordingSend();
    await fetchWithVisitorAdult('https://example.test/rpc', { headers: { a: 'b' } }, send);
    const headers = new Headers(send.mock.calls[0]?.[1]?.headers);
    expect(headers.get('X-Visitor-Adult')).toBeNull();
    expect(headers.get('a')).toBe('b');
    expect(hasVisitorSaidAdult()).toBe(false);
  });

  it('keeps the answer in this browser and sends it with every request after', async () => {
    expect(rememberVisitorSaidAdult()).toBe(true);
    expect(localStorage.getItem(VISITOR_ADULT_STORAGE_KEY)).toBe('yes');
    const send = recordingSend();
    await fetchWithVisitorAdult('https://example.test/rpc', undefined, send);
    expect(new Headers(send.mock.calls[0]?.[1]?.headers).get('X-Visitor-Adult')).toBe('yes');
  });

  it('still sends the answer for this visit when the browser blocks storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(rememberVisitorSaidAdult()).toBe(false);
    setItem.mockRestore();
    const send = recordingSend();
    await fetchWithVisitorAdult('https://example.test/rpc', undefined, send);
    expect(new Headers(send.mock.calls[0]?.[1]?.headers).get('X-Visitor-Adult')).toBe('yes');
  });
});
