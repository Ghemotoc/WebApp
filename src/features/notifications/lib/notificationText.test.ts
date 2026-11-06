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
  commentPlace: null,
  decision: null,
  item: null,
  statement: null,
  outcome: null,
  reportReference: null,
  appeal: null,
  mail: null,
  space: null,
  changeRequest: null,
  staffChange: null,
  dataRequest: null,
  landingPage: null,
  writerRank: null,
  ownHandle: null,
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

  it("a comment on paragraph 4 opens the chapter at that paragraph's thread (IDEAS-1e)", () => {
    const comment: AppNotification = {
      ...newChapter,
      kind: 'comment_on_chapter',
      category: 'replies',
      commentExcerpt: 'Lovely line.',
      commentPlace: 4,
    };
    expect(notificationText(englishT(), comment, null).href).toBe(
      '/s/salt-mine-choir/abc123#paragraph-4',
    );
  });

  it('a reply on a paragraph the writer has since changed opens the earlier-version thread', () => {
    const reply: AppNotification = {
      ...newChapter,
      kind: 'comment_reply',
      category: 'replies',
      commentPlace: 'earlier',
    };
    expect(notificationText(englishT(), reply, null).href).toBe(
      '/s/salt-mine-choir/abc123#paragraph-earlier',
    );
  });

  it('a comment on the whole chapter opens the chapter as before', () => {
    const comment: AppNotification = {
      ...newChapter,
      kind: 'comment_on_chapter',
      category: 'replies',
    };
    expect(notificationText(englishT(), comment, null).href).toBe('/s/salt-mine-choir/abc123');
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

  it('two requests to join a space share one row that opens the list of requests (FORUMS-2c)', () => {
    const requestRow: AppNotification = {
      ...newChapter,
      kind: 'space_join_request',
      category: 'follows',
      actors: [
        { handle: 'ana', displayName: 'Ana' },
        { handle: 'corbu', displayName: 'corbu' },
      ],
      actorCount: 2,
      story: null,
      chapter: null,
      space: { slug: 'fantasy-writers-circle', name: 'Fantasy writers’ circle' },
    };
    const text = notificationText(englishT(), requestRow, null);
    expect(`${text.who} ${text.what}`).toBe('Ana and corbu asked to join Fantasy writers’ circle.');
    expect(text.actionLabel).toBe('See the requests');
    expect(text.href).toBe('/spaces/fantasy-writers-circle#join-requests');
  });

  it('being let into a space opens it and never names who let them in', () => {
    const approvedRow: AppNotification = {
      ...newChapter,
      kind: 'space_join_approved',
      category: 'follows',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      space: { slug: 'fantasy-writers-circle', name: 'Fantasy writers’ circle' },
    };
    const text = notificationText(englishT(), approvedRow, null);
    expect(`${text.who} ${text.what}`).toBe(
      'Your account: you’re in Fantasy writers’ circle. You can now post there.',
    );
    expect(text.href).toBe('/spaces/fantasy-writers-circle');
  });

  it('an offer to take a space over names who offered it and opens the space (IDEAS-3e)', () => {
    const offerRow: AppNotification = {
      ...newChapter,
      kind: 'space_handover_offered',
      category: 'follows',
      actors: [{ handle: 'ana', displayName: 'Ana' }],
      actorCount: 1,
      story: null,
      chapter: null,
      space: { slug: 'fantasy-writers-circle', name: 'Fantasy writers’ circle' },
    };
    const text = notificationText(englishT(), offerRow, null);
    expect(`${text.who} ${text.what}`).toBe(
      'Ana offered you Fantasy writers’ circle. Open it to accept or decline.',
    );
    expect(text.href).toBe('/spaces/fantasy-writers-circle');
  });

  it('a space the reader can no longer see leaves the row without a link', () => {
    const hiddenRow: AppNotification = {
      ...newChapter,
      kind: 'space_join_approved',
      category: 'follows',
      actors: [],
      actorCount: 0,
      space: null,
    };
    expect(notificationText(englishT(), hiddenRow, null).href).toBeNull();
  });

  it('a moderator’s request to change a signature quotes why and leads to Settings (S1-E8-08)', () => {
    const requestRow: AppNotification = {
      ...newChapter,
      kind: 'customisation_change_requested',
      category: 'staff',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      isRequired: true,
      changeRequest: {
        item: 'signature',
        reason: 'No adverts, please.',
        dueAt: '2026-10-26T07:00:00Z',
        isOpen: true,
        space: null,
      },
    };
    const text = notificationText(englishT(), requestRow, null);
    expect(text.who).toBe('Moderation team:');
    expect(text.quote).toBe('No adverts, please.');
    expect(text.href).toBe('/settings#forum-signature');
  });

  it('a request about a banner picture leads to the space’s settings', () => {
    const requestRow: AppNotification = {
      ...newChapter,
      kind: 'customisation_change_requested',
      category: 'staff',
      actors: [],
      actorCount: 0,
      changeRequest: {
        item: 'space_banner',
        reason: 'Not suitable.',
        dueAt: '2026-10-26T07:00:00Z',
        isOpen: true,
        space: { slug: 'fantasy-writers-circle', name: 'Fantasy writers’ circle' },
      },
    };
    const text = notificationText(englishT(), requestRow, null);
    expect(text.what).toContain('Fantasy writers’ circle');
    expect(text.href).toBe('/spaces/fantasy-writers-circle/settings');
  });

  it('a staff change to a story says what changed and why, never who on the staff', () => {
    const changeRow: AppNotification = {
      ...newChapter,
      kind: 'story_changed_by_staff',
      category: 'staff',
      actors: [],
      actorCount: 0,
      chapter: null,
      staffChange: {
        fields: ['category_slug', 'tag_names', 'comments_enabled'],
        visibility: null,
        reasonCode: 'story_details',
        reasonText: 'This is a short story, not a poem.',
      },
    };
    const text = notificationText(englishT(), changeRow, null);
    expect(text.who).toBe('Moderation team:');
    expect(text.what).toBe(
      'we changed the category, the tags and the comments setting of your story “The Salt Mine Choir”.',
    );
    expect(text.quote).toBe('This is a short story, not a poem.');
    expect(text.href).toBe('/write/s/salt-mine-choir/settings');
  });

  it('a chapter shown again by staff names the chapter', () => {
    const shownRow: AppNotification = {
      ...newChapter,
      kind: 'story_changed_by_staff',
      category: 'staff',
      actors: [],
      actorCount: 0,
      staffChange: {
        fields: ['visibility'],
        visibility: 'shown',
        reasonCode: 'other',
        reasonText: 'Fixed.',
      },
    };
    expect(notificationText(englishT(), shownRow, null).what).toBe(
      'chapter 15 of “The Salt Mine Choir” is shown again.',
    );
  });

  it('a removed passage put back by Restore names the chapter (ADMIN-2b2)', () => {
    const putBackRow: AppNotification = {
      ...newChapter,
      kind: 'story_changed_by_staff',
      category: 'staff',
      actors: [],
      actorCount: 0,
      staffChange: {
        fields: ['passage'],
        visibility: null,
        reasonCode: 'other',
        reasonText: 'Not spam after all.',
      },
    };
    expect(notificationText(englishT(), putBackRow, null).what).toBe(
      'we put back the passage we removed from chapter 15 of “The Salt Mine Choir”.',
    );
  });

  it('a hidden title or cover shown again says readers can see it again (ADMIN-2b3)', () => {
    const shownAgain = (field: string): AppNotification => ({
      ...newChapter,
      kind: 'story_changed_by_staff',
      category: 'staff',
      actors: [],
      actorCount: 0,
      chapter: null,
      staffChange: { fields: [field], visibility: null, reasonCode: 'other', reasonText: 'Fine.' },
    });
    expect(notificationText(englishT(), shownAgain('title'), null).what).toBe(
      'readers can see the title of your story “The Salt Mine Choir” again.',
    );
    expect(notificationText(englishT(), shownAgain('cover'), null).what).toBe(
      'readers can see the cover of your story “The Salt Mine Choir” again.',
    );
  });

  it('asking whether a data request was the person’s leads to Settings › Data requests', () => {
    const askRow: AppNotification = {
      ...newChapter,
      kind: 'data_request_confirm',
      category: 'staff',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      isRequired: true,
      dataRequest: { reference: 'D-000007', deadline: '2027-02-28', extensionReason: null },
    };
    const text = notificationText(englishT(), askRow, null);
    expect(text.who).toBe('Your account:');
    expect(text.what).toContain('(D-000007)');
    expect(text.what).toContain('Was it you?');
    expect(text.actionLabel).toBe('Answer');
    expect(text.href).toBe('/settings#data-requests');
  });

  it('an extended data request quotes the reason the team gave', () => {
    const extendedRow: AppNotification = {
      ...newChapter,
      kind: 'data_request_extended',
      category: 'staff',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      isRequired: true,
      dataRequest: {
        reference: 'D-000007',
        deadline: '2027-04-28',
        extensionReason: 'Many stories to gather.',
      },
    };
    const text = notificationText(englishT(), extendedRow, null);
    expect(text.what).toContain('D-000007');
    expect(text.quote).toBe('Many stories to gather.');
    expect(text.href).toBe('/settings#data-requests');
  });

  it('a data request’s copy being ready leads to Settings to download it (part c2)', () => {
    const readyRow: AppNotification = {
      ...newChapter,
      kind: 'data_request_copy_ready',
      category: 'staff',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      isRequired: true,
      dataRequest: { reference: 'D-000009', deadline: '2027-02-28', extensionReason: null },
    };
    const text = notificationText(englishT(), readyRow, null);
    expect(text.who).toBe('Your account:');
    expect(text.what).toContain('D-000009');
    expect(text.what).toContain('within seven days');
    expect(text.actionLabel).toBe('Download it');
    expect(text.href).toBe('/settings#data-requests');
  });

  it('entries opening names the landing page in the reader’s language and links to it (CONTESTS-13a2b)', () => {
    const openRow: AppNotification = {
      ...newChapter,
      kind: 'landing_entries_open',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      landingPage: {
        slug: 'iarna',
        titles: { ro: 'Concursul de iarnă', en: 'The winter contest' },
      },
    };
    const text = notificationText(englishT(), openRow, null);
    expect(text.what).toContain('The winter contest');
    expect(text.href).toBe('/c/iarna');
    expect(text.actionLabel).toBe('Open the page');
  });

  it('a new rank names the rank and links to the writer’s own profile (IDEAS-3a)', () => {
    const rankRow: AppNotification = {
      ...newChapter,
      kind: 'rank_reached',
      category: 'stories',
      actors: [],
      actorCount: 0,
      story: null,
      chapter: null,
      writerRank: 'storyteller',
      ownHandle: 'corbu',
    };
    const text = notificationText(englishT(), rankRow, 'corbu');
    expect(text.who).toBe('Your rank:');
    expect(text.what).toBe('you’re now a Storyteller. Well done.');
    expect(text.actionLabel).toBe('See your rank');
    expect(text.href).toBe('/u/corbu');
  });

  it('a story in Featured this week names the story, not the staff member, and opens it (S1-E5-10)', () => {
    const featuredRow: AppNotification = {
      ...newChapter,
      kind: 'story_featured',
      category: 'stories',
      actors: [],
      actorCount: 0,
      chapter: null,
      story: { slug: 'the-salt-mine-choir', title: 'The Salt Mine Choir' },
    };
    const text = notificationText(englishT(), featuredRow, 'corbu');
    expect(text.who).toBe('Our team:');
    expect(text.what).toBe(
      'your story “The Salt Mine Choir” is in Featured this week on Discover.',
    );
    expect(text.actionLabel).toBe('Open the story');
    expect(text.href).toBe('/s/the-salt-mine-choir');
  });

  it('the parent’s yes to suggestions, and its withdrawal, lead to Settings › Privacy (S1-E2-03b)', () => {
    const spotlightRow: AppNotification = {
      ...newChapter,
      kind: 'spotlight_consent_agreed',
      category: 'staff',
      actors: [],
      actorCount: 0,
      chapter: null,
      story: null,
    };
    const agreed = notificationText(englishT(), spotlightRow, 'ana');
    expect(agreed.who).toBe('Your account:');
    expect(agreed.what).toBe(
      'your parent or guardian agreed that we may suggest you and your stories to other readers.',
    );
    expect(agreed.href).toBe('/settings#privacy');
    const withdrawn = notificationText(
      englishT(),
      { ...spotlightRow, kind: 'spotlight_consent_withdrawn' },
      'ana',
    );
    expect(withdrawn.what).toContain('we no longer suggest you');
    expect(withdrawn.actionLabel).toBe('See your privacy settings');
  });
});
