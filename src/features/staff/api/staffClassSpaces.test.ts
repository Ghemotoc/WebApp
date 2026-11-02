/**
 * Tests for Staff › Schools › Class spaces on the screen side (bundle CLASSES, part d; story
 * S1-E8-11 criterion 10). Supabase is a small fake here; the database rules are in
 * supabase/tests/database/235-class-pilot-setup.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  createStaffClassSpace,
  listStaffClassSpaces,
  setStaffClassSchool,
  staffClassErrorFrom,
} from './staffClassSpaces';

/**
 * A fake client whose rpc() answers once with the given data or error.
 *
 * @param answer - what the database sends back
 * @returns the client and the rpc spy
 */
function fakeClient(answer: { data?: unknown; error?: { code?: string; hint?: string } }) {
  const rpc = vi.fn().mockResolvedValue({ data: answer.data ?? null, error: answer.error ?? null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('staffClassErrorFrom', () => {
  it('reads an account without the badge from its hint', () => {
    expect(staffClassErrorFrom({ hint: 'not_a_teacher' }).failure).toBe('not_a_teacher');
  });

  it('reads any name or description problem as a text problem', () => {
    expect(staffClassErrorFrom({ hint: 'description:empty' }).failure).toBe('text');
  });

  it('reads a refused permission without a hint from its code', () => {
    expect(staffClassErrorFrom({ code: '42501' }).failure).toBe('not_allowed');
  });
});

describe('listStaffClassSpaces', () => {
  it('reads each class with its teacher and status, never a user ID', async () => {
    const { client } = fakeClient({
      data: [
        {
          slug: 'class-5a',
          name: 'Class 5A',
          school_name: 'School no. 1',
          teacher: { handle: 'ms.pop', display_name: 'Ms Pop', is_staff: false },
          member_count: 24,
          locks_at: '2027-06-30T21:00:00Z',
          is_locked: false,
          archived_at: null,
        },
      ],
    });
    const [space] = await listStaffClassSpaces(client);
    expect(space).toEqual({
      slug: 'class-5a',
      name: 'Class 5A',
      schoolName: 'School no. 1',
      teacherHandle: 'ms.pop',
      teacherName: 'Ms Pop',
      memberCount: 24,
      locksAt: '2027-06-30T21:00:00Z',
      isLocked: false,
      archivedAt: null,
    });
  });
});

describe('createStaffClassSpace', () => {
  it('sends the teacher’s username without an @ and returns the new address', async () => {
    const { client, rpc } = fakeClient({ data: { slug: 'class-5a' } });
    const slug = await createStaffClassSpace(client, {
      teacherHandle: ' @ms.pop ',
      name: 'Class 5A',
      schoolName: 'School no. 1',
      description: 'Our writing club',
    });
    expect(slug).toBe('class-5a');
    expect(rpc).toHaveBeenCalledWith('admin_create_class_space', {
      teacher_handle: 'ms.pop',
      name: 'Class 5A',
      school_name: 'School no. 1',
      description: 'Our writing club',
    });
  });
});

describe('setStaffClassSchool', () => {
  it('throws "school needed" when the name is empty', async () => {
    const { client } = fakeClient({ error: { hint: 'school:needed' } });
    await expect(
      setStaffClassSchool(client, { slug: 'class-5a', schoolName: ' ' }),
    ).rejects.toMatchObject({ failure: 'school_needed' });
  });
});
