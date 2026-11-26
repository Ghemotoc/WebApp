/**
 * Tests for CountBadge (design books item 16; Robert's pick "Small number, 9+ cap", 24 Nov 2026).
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createI18n } from '@/lib/i18n';

import { CountBadge } from './CountBadge';
import { badgeLinkName, formatBadgeCount } from './countBadgeText';

describe('formatBadgeCount', () => {
  it('shows nothing when nothing is new', () => {
    expect(formatBadgeCount(0)).toBe('');
    expect(formatBadgeCount(-3)).toBe('');
    expect(formatBadgeCount(Number.NaN)).toBe('');
  });

  it('spells out 1 to 9', () => {
    expect(formatBadgeCount(1)).toBe('1');
    expect(formatBadgeCount(9)).toBe('9');
  });

  it('caps anything above 9 at 9+', () => {
    expect(formatBadgeCount(10)).toBe('9+');
    expect(formatBadgeCount(250)).toBe('9+');
  });
});

describe('CountBadge', () => {
  it('draws nothing for a count of 0', () => {
    const { container } = render(<CountBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is hidden from screen readers, because the link says the full count', () => {
    const { container } = render(<CountBadge count={12} />);
    const badge = container.querySelector('[data-count-badge]');
    expect(badge).toHaveTextContent('9+');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('badgeLinkName', () => {
  /** The bell's keys, in common.json. */
  const bellKeys = {
    none: 'nav.notifications',
    some: 'nav.notificationsUnread',
    many: 'nav.notificationsManyUnread',
  };
  /** The Messages link's keys, in common.json. */
  const chatKeys = {
    none: 'nav.messages',
    some: 'nav.messagesUnread',
    many: 'nav.messagesManyUnread',
  };

  it('says the plain name when nothing is new', () => {
    const t = createI18n('en').getFixedT('en');
    expect(badgeLinkName(t, bellKeys, 0)).toBe('Notifications');
  });

  it('says the same number the badge shows up to 9', () => {
    const t = createI18n('en').getFixedT('en');
    expect(badgeLinkName(t, bellKeys, 3)).toBe('Notifications, 3 new');
    expect(badgeLinkName(t, chatKeys, 1)).toBe('Messages, 1 chat with new messages');
  });

  it('says 9+ in English once the badge does, so the name holds the visible text', () => {
    const t = createI18n('en').getFixedT('en');
    expect(badgeLinkName(t, bellKeys, 11)).toBe('Notifications, 9+ new');
    expect(badgeLinkName(t, chatKeys, 40)).toBe('Messages, 9+ chats with new messages');
  });

  it('says 9+ in Romanian once the badge does', () => {
    const t = createI18n('ro').getFixedT('ro');
    expect(badgeLinkName(t, bellKeys, 11)).toBe('Notificări, 9+ noi');
    expect(badgeLinkName(t, chatKeys, 12)).toBe('Mesaje, 9+ conversații cu mesaje noi');
  });
});
