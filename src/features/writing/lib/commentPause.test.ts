/**
 * The "Pause new comments" switch's rules (bundle CALM-8; IDEA-20261109-8; the design handover's
 * Step 4, points 1 to 3).
 */
import { describe, expect, it } from 'vitest';

import { answerAfterToggle, commentPauseView, pauseEndFrom } from './commentPause';

const now = new Date('2026-11-20T16:40:00Z');
const inTwoHours = '2026-11-20T18:40:00Z';
const anHourAgo = '2026-11-20T15:40:00Z';

describe('pauseEndFrom', () => {
  it('ends 24 hours, 3 days or 7 days from now', () => {
    expect(pauseEndFrom('24h', now).toISOString()).toBe('2026-11-21T16:40:00.000Z');
    expect(pauseEndFrom('3d', now).toISOString()).toBe('2026-11-23T16:40:00.000Z');
    expect(pauseEndFrom('7d', now).toISOString()).toBe('2026-11-27T16:40:00.000Z');
  });

  it('counts hours across a summer-time change, as the database does', () => {
    // Romania moves its clocks forward on 28 March 2027: 3 days is still 72 hours, so the end the
    // switch names is the end comment_pause_end() saves (387-pause-comments.test.sql).
    const beforeTheChange = new Date('2027-03-26T18:00:00Z');
    expect(pauseEndFrom('3d', beforeTheChange).toISOString()).toBe('2027-03-29T18:00:00.000Z');
  });
});

describe('commentPauseView', () => {
  it('is off by default', () => {
    expect(commentPauseView(null, null, now)).toEqual({ isOn: false, choosing: null, end: null });
  });

  it('shows "For how long" and the end a picked length gives from now', () => {
    const view = commentPauseView('3d', null, now);
    expect(view.isOn).toBe(true);
    expect(view.choosing).toBe('3d');
    expect(view.end?.toISOString()).toBe('2026-11-23T16:40:00.000Z');
  });

  it('is on with the saved end while a pause runs, without "For how long"', () => {
    const view = commentPauseView(null, inTwoHours, now);
    expect(view).toEqual({ isOn: true, choosing: null, end: new Date(inTwoHours) });
  });

  it('is off once the writer turns a running pause off, before the save', () => {
    expect(commentPauseView('off', inTwoHours, now).isOn).toBe(false);
  });

  it('is off when the saved pause has ended', () => {
    expect(commentPauseView(null, anHourAgo, now).isOn).toBe(false);
  });
});

describe('answerAfterToggle', () => {
  it('turns on with 24 hours chosen', () => {
    expect(answerAfterToggle(null, null, now)).toBe('24h');
  });

  it('turning a picked length off again asks for nothing', () => {
    expect(answerAfterToggle('7d', null, now)).toBeNull();
  });

  it('turning a running pause off ends it on save, and on again keeps it as saved', () => {
    expect(answerAfterToggle(null, inTwoHours, now)).toBe('off');
    expect(answerAfterToggle('off', inTwoHours, now)).toBeNull();
  });

  it('starts a new pause once the saved one has ended', () => {
    expect(answerAfterToggle(null, anHourAgo, now)).toBe('24h');
  });
});
