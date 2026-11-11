/**
 * Unit tests for how a refused custom role change becomes one plain reason (story S1-E11-33,
 * bundle CMS-2a).
 */
import { describe, expect, it } from 'vitest';

import { customRoleFailureFrom } from './customRoles';

describe('customRoleFailureFrom', () => {
  it('names the custom role problem the database hints at', () => {
    expect(customRoleFailureFrom({ code: '23514', hint: 'bad_name' })).toBe('bad_name');
    expect(customRoleFailureFrom({ code: '23505', hint: 'name_taken' })).toBe('name_taken');
    expect(customRoleFailureFrom({ code: '23514', hint: 'no_areas' })).toBe('no_areas');
    expect(customRoleFailureFrom({ code: '42501', hint: 'role_out_of_reach' })).toBe(
      'role_out_of_reach',
    );
  });

  it('reads an area out of reach whatever area it names', () => {
    expect(customRoleFailureFrom({ code: '42501', hint: 'area_out_of_reach:roles' })).toBe(
      'area_out_of_reach',
    );
  });

  it('falls back on the refusals the built-in roles share', () => {
    expect(customRoleFailureFrom({ code: '42501', hint: 'own_role' })).toBe('own_role');
    expect(customRoleFailureFrom({ code: '42501' })).toBe('not_allowed');
    expect(customRoleFailureFrom({})).toBe('unreachable');
  });
});
