/**
 * What each notification says and where it leads (story S1-E7-01; board 6.2): grouped people
 * read "a, b and 10 others", a decision says what was decided, and every row links to its item.
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
});
