/**
 * Unit tests for the public report form's answers (story S1-E10-02): what counts as missing and
 * the request the answers become. The server and the database check the same rules again
 * (server/notice.test.ts, pgTAP test 145).
 */
import { describe, expect, it } from 'vitest';

import { emptyNoticeDraft, findNoticeProblems, toNoticeRequest } from './noticeDraft';

const complete = {
  ...emptyNoticeDraft,
  kind: 'copyright' as const,
  contentUrl: ' https://example.test/s/a-story ',
  explanation: 'My poem, copied.',
  notifierName: 'Ana',
  notifierEmail: 'ana@example.test',
  goodFaith: true,
};

describe('the report form answers', () => {
  it('lists everything a notice needs on an empty form', () => {
    expect(findNoticeProblems(emptyNoticeDraft)).toEqual({
      kind: 'kind_missing',
      contentUrl: 'url_missing',
      explanation: 'explanation_missing',
      notifierName: 'name_missing',
      notifierEmail: 'email_invalid',
      goodFaith: 'good_faith_missing',
    });
  });

  it('asks for a name, an email and the good-faith statement for a notice', () => {
    const problems = findNoticeProblems({
      ...complete,
      notifierName: '',
      notifierEmail: 'not-an-address',
      goodFaith: false,
    });
    expect(problems).toEqual({
      notifierName: 'name_missing',
      notifierEmail: 'email_invalid',
      goodFaith: 'good_faith_missing',
    });
  });

  it('lets a child sexual content notice leave the name and email out, but checks a typed email', () => {
    const anonymous = {
      ...complete,
      kind: 'child_sexual_content' as const,
      notifierName: '',
      notifierEmail: '',
    };
    expect(findNoticeProblems(anonymous)).toEqual({});
    expect(findNoticeProblems({ ...anonymous, notifierEmail: 'nope' })).toEqual({
      notifierEmail: 'email_invalid',
    });
  });

  it('asks a removal order for the authority and an email, but never the good-faith box', () => {
    const order = { ...complete, kind: 'removal_order' as const, goodFaith: false };
    expect(findNoticeProblems({ ...order, notifierEmail: '' })).toEqual({
      authorityName: 'authority_missing',
      notifierEmail: 'email_invalid',
    });
    expect(findNoticeProblems({ ...order, authorityName: 'Test authority' })).toEqual({});
  });

  it('turns a notice into a trimmed request with the bot-check fields', () => {
    expect(toNoticeRequest(complete, 'ro', 1000)).toEqual({
      kind: 'notice',
      reason: 'copyright',
      contentUrl: 'https://example.test/s/a-story',
      explanation: 'My poem, copied.',
      notifierName: 'Ana',
      notifierEmail: 'ana@example.test',
      goodFaith: true,
      language: 'ro',
      website: undefined,
      openedAt: 1000,
    });
  });

  it('turns an order into a request without the honeypot or the timing', () => {
    const request = toNoticeRequest(
      { ...complete, kind: 'removal_order', authorityName: ' Authority ', website: 'x' },
      'en',
      1000,
    );
    expect(request).toEqual({
      kind: 'removal_order',
      contentUrl: 'https://example.test/s/a-story',
      explanation: 'My poem, copied.',
      authorityName: 'Authority',
      orderReference: undefined,
      notifierEmail: 'ana@example.test',
      language: 'en',
    });
  });
});
