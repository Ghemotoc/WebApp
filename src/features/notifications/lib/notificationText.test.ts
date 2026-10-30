/**
 * What each notification says and where it leads (story S1-E7-01; board 6.2): grouped people
 * read "a, b and 10 others", a decision says what was decided, and every row links to its item.
 * Since S1-E10-04 a decision with a statement links to the reasons, and a reporter hears the
 * outcome without anyone's sanction.
 */
import { describe, expect, it } from 'vitest';

import { createI18n } from '@/lib/i18n';

import type { AppNotification } from '../api/notifications';
import { registerNotificationsTranslations } from '../registerNotificationsTranslations';

import { notificationText, whoDidIt } from './notificationText';

/** English text, as a reader who chose English sees it. */
function englishT() {
  const i18n = createI18n('en');
  registerNotificationsTranslations(i18n);
  return i18n.getFixedT('en', 'notifications');
}

/** A new chapter from inkwolf; each test changes what it needs. */
const newChapter: AppNotification = {
  id: 'n1',
  kind: 'new_chapter',
  category: 'stories',
  actors: [{ handle: 'inkwolf', displayName: 'Ink Wolf' }],
  actorCount: 1,
  story: { slug: 'salt-mine-choir', title: 'The Salt Mine Choir' },
  chapter: { code: 'abc123', title: 'Fifteen', position: 15 },
  commentExcerpt: null,
  decision: null,
  item: null,
  statement: null,
  outcome: null,
  reportReference: null,
  appeal: null,
  mail: null,
  isRequired: false,
  isRead: false,
  at: '2026-10-25T07:00:00Z',
};

describe('notificationText', () => {
  it('a new chapter names the chapter and story and links to the reader', () => {
    const text = notificationText(englishT(), newChapter, null);
    expect(`${text.who} ${text.what}`).toBe(
      'Ink Wolf published Chapter 15 of The Salt Mine Choir.',
    );
    expect(text.href).toBe('/s/salt-mine-choir/abc123');
    expect(text.actionLabel).toBe('Read now');
  });

  it('twelve reactions read as two names and 10 others, with a pill counting them', () => {
    const reactions: AppNotification = {
      ...newChapter,
      kind: 'comment_reactions',
      category: 'replies',
      actors: [
        { handle: 'ilinca.r', displayName: 'ilinca.r' },
        { handle: 'corbu', displayName: 'corbu' },
      ],
      actorCount: 12,
    };
    const text = notificationText(englishT(), reactions, null);
    expect(text.who).toBe('ilinca.r, corbu and 10 others');
    expect(text.grouped).toBe('12 reactions');
  });

  it('two people read as "a and b"', () => {
    const two = {
      ...newChapter,
      actors: [...newChapter.actors, { handle: 'corbu', displayName: 'corbu' }],
      actorCount: 2,
    };
    expect(whoDidIt(englishT(), two)).toBe('Ink Wolf and corbu');
  });

  it("several new followers open the reader's own profile, where their followers are listed", () => {
    const followers: AppNotification = {
      ...newChapter,
      kind: 'new_follower',
      category: 'follows',
      story: null,
      chapter: null,
      actorCount: 5,
    };
    const text = notificationText(englishT(), followers, 'lia.writes');
    expect(text.href).toBe('/u/lia.writes');
    expect(text.actionLabel).toBe('See who');
  });

  it('a decision comes from the moderation team and says what was decided', () => {
    const decision: AppNotification = {
      ...newChapter,
      kind: 'moderation_decision',
      category: 'staff',
      actors: [],
      actorCount: 0,
      decision: 'no_action',
      item: { itemType: 'comment', reference: 'R-000001', address: '/s/salt-mine-choir/abc123' },
      isRequired: true,
    };
    const text = notificationText(englishT(), decision, null);
    expect(text.who).toBe('Moderation team:');
    expect(text.what).toBe(
      'a moderator checked a report about your comment and took no action, so nothing changes.',
    );
    expect(text.href).toBe('/s/salt-mine-choir/abc123');
  });

  it('a decision with a statement of reasons links to the reasons', () => {
    const decision: AppNotification = {
      ...newChapter,
      kind: 'moderation_decision',
      category: 'staff',
      actors: [],
      actorCount: 0,
      decision: 'remove',
      item: { itemType: 'comment', reference: 'R-000001', address: '/s/salt-mine-choir/abc123' },
      statement: { reference: 'S-000007', action: 'remove' },
      isRequired: true,
    };
    const text = notificationText(englishT(), decision, null);
    expect(text.actionLabel).toBe('Read why');
    expect(text.href).toBe('/my-reports#S-000007');
  });

  it('a sanction from the account page says what was done from its statement', () => {
    const decision: AppNotification = {
      ...newChapter,
      kind: 'moderation_decision',
      category: 'staff',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      statement: { reference: 'S-000008', action: 'suspend' },
      isRequired: true,
    };
    expect(notificationText(englishT(), decision, null).what).toBe(
      'a moderator paused your account for a while.',
    );
  });

  it('a reporter hears what came of the report, never a sanction', () => {
    const outcome: AppNotification = {
      ...newChapter,
      kind: 'report_outcome',
      category: 'staff',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      outcome: 'acted',
      reportReference: 'R-000042',
    };
    const text = notificationText(englishT(), outcome, null);
    expect(text.what).toBe('we checked your report R-000042 and took action.');
    expect(text.href).toBe('/my-reports');
  });

  it('an appeal outcome says the decision stands and opens the statement', () => {
    const appealRow: AppNotification = {
      ...newChapter,
      kind: 'appeal_decided',
      category: 'staff',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      appeal: { reference: 'A-000003', outcome: 'upheld', statementReference: 'S-000007' },
    };
    const text = notificationText(englishT(), appealRow, null);
    expect(text.what).toContain('The decision stands.');
    expect(text.href).toBe('/my-reports#S-000007');
  });

  it('a reply from the moderators links to the thread and never names who wrote', () => {
    const mailRow: AppNotification = {
      ...newChapter,
      kind: 'moderator_mail_reply',
      category: 'staff',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      mail: { reference: 'M-000012', subject: 'My story vanished' },
    };
    const text = notificationText(englishT(), mailRow, null);
    expect(text.who).toBe('Moderation team:');
    expect(text.quote).toBe('My story vanished');
    expect(text.href).toBe('/moderator-mail/M-000012');
  });
});
