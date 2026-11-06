/**
 * Unit tests for which Settings group an address opens (bundle PROFILE-1, 6 Nov 2026).
 */
import { describe, expect, it } from 'vitest';

import { settingsGroupKeys, settingsGroupOfHash } from './settingsGroups';

describe('the Settings groups', () => {
  it('opens Profile when the address names no group', () => {
    expect(settingsGroupOfHash('')).toBe('profile');
    expect(settingsGroupOfHash('#')).toBe('profile');
  });

  it('opens the group the address names', () => {
    for (const key of settingsGroupKeys) expect(settingsGroupOfHash(`#${key}`)).toBe(key);
  });

  it('opens the group that holds a panel older links point to', () => {
    expect(settingsGroupOfHash('#teacher-badge')).toBe('profile');
    expect(settingsGroupOfHash('#forum-signature')).toBe('profile');
    expect(settingsGroupOfHash('#ways-to-log-in')).toBe('account');
    expect(settingsGroupOfHash('#parent-consent')).toBe('privacy');
    expect(settingsGroupOfHash('#download-my-stories')).toBe('download-my-data');
    expect(settingsGroupOfHash('#data-requests')).toBe('download-my-data');
  });

  it('falls back to Profile for an address it does not know', () => {
    expect(settingsGroupOfHash('#markets')).toBe('profile');
    expect(settingsGroupOfHash('#<script>')).toBe('profile');
  });
});
