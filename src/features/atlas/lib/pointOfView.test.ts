/**
 * Tests for pointOfView.ts: the "Point of view" drop-down's value and the change it saves
 * (bundle G10 ATLAS, part c2).
 */
import { describe, expect, it } from 'vitest';

import { narratorValue, pointOfViewChange, pointOfViewValue } from './pointOfView';

describe('who tells a chapter', () => {
  it('a chapter told by nobody yet shows the empty choice', () => {
    expect(pointOfViewValue({ povCharacterId: null, povIsNarrator: false })).toBe('');
  });

  it('a chapter told by a character shows that character', () => {
    expect(pointOfViewValue({ povCharacterId: 'k1', povIsNarrator: false })).toBe('k1');
  });

  it('a chapter told by the Narrator shows the Narrator', () => {
    expect(pointOfViewValue({ povCharacterId: null, povIsNarrator: true })).toBe(narratorValue);
  });

  it('picking the Narrator clears the character', () => {
    expect(pointOfViewChange(narratorValue)).toEqual({
      pov_character_id: '',
      pov_is_narrator: true,
    });
  });

  it('picking a character, or nobody, takes the Narrator off', () => {
    expect(pointOfViewChange('k1')).toEqual({ pov_character_id: 'k1', pov_is_narrator: false });
    expect(pointOfViewChange('')).toEqual({ pov_character_id: '', pov_is_narrator: false });
  });
});
