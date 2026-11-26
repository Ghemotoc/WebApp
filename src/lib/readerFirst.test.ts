/**
 * Tests for readerFirst (the reader speed check, 25 Nov 2026): while a chapter's first paragraph
 * is on its way, the app's other requests wait; the chapter and sign-in never do, and the wait
 * ends by itself.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  HOLD_LIMIT_MILLISECONDS,
  holdForReader,
  releaseForReader,
  requestAddress,
  waitForReaderTurn,
} from './readerFirst';

/** A request the shell makes while the reader loads. */
const shellRequest = 'http://localhost:54321/rest/v1/rpc/my_settings';

/**
 * Whether a promise has settled after the microtasks run.
 *
 * @param promise - the promise to look at
 * @returns true once it has settled
 */
async function hasSettled(promise: Promise<void>): Promise<boolean> {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  await Promise.resolve();
  await Promise.resolve();
  return settled;
}

afterEach(() => {
  releaseForReader();
  vi.useRealTimers();
});

describe('the reader goes first', () => {
  it('lets every request through when no chapter is loading', async () => {
    expect(await hasSettled(waitForReaderTurn(shellRequest))).toBe(true);
  });

  it('holds the shell’s requests until the first paragraph is painted', async () => {
    holdForReader();
    const waiting = waitForReaderTurn(shellRequest);
    expect(await hasSettled(waiting)).toBe(false);
    releaseForReader();
    expect(await hasSettled(waiting)).toBe(true);
  });

  it('never holds the chapter itself or signing in', async () => {
    holdForReader();
    const chapter = 'http://localhost:54321/rest/v1/rpc/get_chapter';
    const signIn = 'http://localhost:54321/auth/v1/token?grant_type=refresh_token';
    expect(await hasSettled(waitForReaderTurn(chapter))).toBe(true);
    expect(await hasSettled(waitForReaderTurn(signIn))).toBe(true);
  });

  it('ends the hold by itself, so nothing waits for good', async () => {
    vi.useFakeTimers();
    holdForReader();
    const waiting = waitForReaderTurn(shellRequest);
    vi.advanceTimersByTime(HOLD_LIMIT_MILLISECONDS);
    expect(await hasSettled(waiting)).toBe(true);
  });

  it('reads the address of a string, a URL and a Request alike', () => {
    expect(requestAddress(shellRequest)).toBe(shellRequest);
    expect(requestAddress(new URL(shellRequest))).toBe(shellRequest);
    expect(requestAddress(new Request(shellRequest))).toBe(shellRequest);
  });
});
