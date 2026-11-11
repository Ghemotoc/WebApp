/**
 * Tests for ticketStatusPill: the words and colour of a member's support request status (G11c).
 */
import { describe, expect, it } from 'vitest';

import { ticketStatusPill } from './ticketStatusPill';

describe('ticketStatusPill', () => {
  it('says "We answered" while a request is going and the team wrote last', () => {
    expect(ticketStatusPill('open', true)).toEqual({ state: 'answered', tone: 'gold' });
    expect(ticketStatusPill('pending_on_user', true)).toEqual({ state: 'answered', tone: 'gold' });
  });

  it('names the status when the member wrote last', () => {
    expect(ticketStatusPill('new', false)).toEqual({ state: 'new', tone: 'sky' });
    expect(ticketStatusPill('on_hold', false)).toEqual({ state: 'on_hold', tone: 'neutral' });
  });

  it('a solved or closed request says so, whoever wrote last', () => {
    expect(ticketStatusPill('solved', true)).toEqual({ state: 'solved', tone: 'sage' });
    expect(ticketStatusPill('closed', true)).toEqual({ state: 'closed', tone: 'sage' });
  });
});
