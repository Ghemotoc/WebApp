/**
 * How the database's refusals become words the screen can say (bundle FORUMS-1, part b;
 * S1-E8-02): forumWriteErrorFrom() and failureMessages().
 */
import { describe, expect, it } from 'vitest';

import { failureMessages } from '../lib/forumFailures';

import { forumWriteErrorFrom } from './forumWrites';

/** A stand-in for t(): the key, with the count when there is one. */
function translate(key: string, values: Record<string, unknown>): string {
  return values['count'] === undefined ? key : `${key}:${String(values['count'])}`;
}

describe('forumWriteErrorFrom', () => {
  it('reads a signed-out, a read-only and someone else’s post from 42501 and its hint', () => {
    expect(forumWriteErrorFrom({ code: '42501', hint: 'signed_out' }).failure).toBe('signed_out');
    expect(forumWriteErrorFrom({ code: '42501', hint: 'not_active' }).failure).toBe('not_active');
    expect(forumWriteErrorFrom({ code: '42501', hint: 'not_mine' }).failure).toBe('not_mine');
  });

  it('reads the minutes to wait from the post limit', () => {
    const error = forumWriteErrorFrom({ code: '54000', hint: 'wait_minutes:12' });
    expect(error.failure).toBe('too_many');
    expect(error.details.waitMinutes).toBe(12);
  });

  it('puts a refused field under that field, and a category above the buttons', () => {
    const html = forumWriteErrorFrom({ code: '23514', hint: 'body:html' });
    expect(failureMessages(html, translate)).toEqual({
      title: undefined,
      body: 'failures.body.html',
      general: null,
    });
    const title = forumWriteErrorFrom({ code: '23514', hint: 'title:empty' });
    expect(failureMessages(title, translate).title).toBe('failures.title.empty');
    const category = forumWriteErrorFrom({ code: '23514', hint: 'forum:category' });
    expect(failureMessages(category, translate).general).toBe('failures.category');
  });

  it('says how long to wait, or just to wait when the minutes are unknown', () => {
    const known = forumWriteErrorFrom({ code: '54000', hint: 'wait_minutes:3' });
    expect(failureMessages(known, translate).general).toBe('failures.too_many:3');
    const unknown = forumWriteErrorFrom({ code: '54000', hint: '' });
    expect(failureMessages(unknown, translate).general).toBe('failures.too_many_unknown');
  });

  it('treats anything else as unreachable', () => {
    expect(forumWriteErrorFrom({ code: 'P0002' }).failure).toBe('gone');
    expect(forumWriteErrorFrom({ code: '08000' }).failure).toBe('unreachable');
  });
});
