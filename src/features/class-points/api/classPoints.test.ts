/**
 * Tests for class points on the screen side (bundle CLASS-POINTS, part 1; stories S1-E8-13 and
 * S1-E8-14): reading the database's answers and sending the calls. Supabase is a small fake
 * here; the rules themselves are in supabase/tests/database/377-class-points.test.sql and
 * 378-class-points-safety.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  chapterClassPointsFrom,
  classPointsErrorFrom,
  classPointsSummaryFrom,
  fetchChapterClassPoints,
  giveClassPoints,
  setTeacherPoints,
  threadTeacherPointsFrom,
} from './classPoints';
import { classPointsTableFrom } from './classPointsTable';

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

/** What class_chapter_points() answers a classmate. */
const classmateAnswer = {
  class: { slug: 'clasa-a-x-a', name: 'Clasa a X-a' },
  role: 'classmate',
  is_locked: false,
  giving: {
    budget: 10,
    left: 8,
    cap: 3,
    given: 2,
    note: 'Mi-a plăcut finalul.',
    note_max: 200,
    resets_on: '2027-03-08',
    can_give: true,
  },
  received: null,
  teacher: null,
};

describe('classPointsSummaryFrom', () => {
  it('reads a pupil’s week and the points their chapters received', () => {
    const summary = classPointsSummaryFrom({
      enabled: true,
      role: 'pupil',
      can_switch: false,
      budget: 10,
      cap: 3,
      left: 7,
      resets_on: '2027-03-08',
      received_total: 5,
    });
    expect(summary).toMatchObject({
      isEnabled: true,
      role: 'pupil',
      budget: 10,
      cap: 3,
      week: { left: 7, resetsOn: '2027-03-08' },
      receivedTotal: 5,
    });
  });

  it('gives a teacher no week and no received total', () => {
    const summary = classPointsSummaryFrom({ enabled: false, role: 'teacher', can_switch: true });
    expect(summary).toMatchObject({ role: 'teacher', canSwitch: true, week: null });
    expect(summary?.receivedTotal).toBeNull();
  });

  it('is null for someone outside the class', () => {
    expect(classPointsSummaryFrom(null)).toBeNull();
  });
});

describe('chapterClassPointsFrom', () => {
  it('reads what a classmate may give and shows them no total', () => {
    const points = chapterClassPointsFrom(classmateAnswer);
    expect(points?.role).toBe('classmate');
    expect(points?.giving).toMatchObject({ left: 8, given: 2, noteMax: 200, canGive: true });
    expect(points?.received).toBeNull();
  });

  it('reads the writer’s total and notes, and no note carries a giver', () => {
    const points = chapterClassPointsFrom({
      class: { slug: 'clasa-a-x-a', name: 'Clasa a X-a' },
      role: 'writer',
      received: {
        total: 4,
        notes: [
          { id: 'gift-1', note: 'Bravo.' },
          { id: 'gift-2', note: '' },
        ],
      },
      teacher: { id: 'teacher-1', points: 7, note: 'Dialog bun.' },
    });
    // A gift with no words is left out; a note is its ID and its words and nothing else.
    expect(points?.received).toEqual({ total: 4, notes: [{ id: 'gift-1', note: 'Bravo.' }] });
    expect(points?.teacher).toEqual({ id: 'teacher-1', points: 7, note: 'Dialog bun.' });
  });

  it('is null when the database answers nothing or an unknown role', () => {
    expect(chapterClassPointsFrom(null)).toBeNull();
    expect(chapterClassPointsFrom({ class: { slug: 'a', name: 'A' }, role: 'visitor' })).toBeNull();
  });
});

describe('threadTeacherPointsFrom', () => {
  it('keeps the teacher points by the reply they are on', () => {
    const thread = threadTeacherPointsFrom({
      is_teacher: true,
      teacher_max: 10,
      notes_on: true,
      note_max: 1000,
      is_locked: false,
      replies: [{ post_id: 'post-1', id: 'row-1', points: 6, note: null }, { id: 'row-2' }],
    });
    expect(thread?.isTeacher).toBe(true);
    expect(thread?.byPostId).toEqual({ 'post-1': { id: 'row-1', points: 6, note: null } });
  });
});

describe('classPointsTableFrom', () => {
  it('reads each pupil’s two numbers and chapters, with no rank and no giver', () => {
    const pupils = classPointsTableFrom({
      pupils: [
        {
          handle: 'ana',
          display_name: 'Ana',
          class_points: 5,
          teacher_points: 7,
          chapters: [
            {
              chapter_id: 'chapter-1',
              story_slug: 'caiet',
              story_title: 'Caiet',
              chapter_code: 'abc',
              chapter_position: 1,
              class_points: 5,
              teacher_points: null,
              is_reported: true,
            },
          ],
        },
      ],
    });
    expect(pupils).toHaveLength(1);
    expect(pupils?.[0]).toMatchObject({ handle: 'ana', classPoints: 5, teacherPoints: 7 });
    expect(pupils?.[0]?.chapters[0]).toMatchObject({ teacherPoints: null, isReported: true });
    expect(Object.keys(pupils?.[0] ?? {})).not.toContain('rank');
  });

  it('is null for anyone but the teacher', () => {
    expect(classPointsTableFrom(null)).toBeNull();
  });
});

describe('classPointsErrorFrom', () => {
  it('names the refusal by the database’s hint', () => {
    expect(classPointsErrorFrom({ hint: 'points:budget' }).failure).toBe('budget');
    expect(classPointsErrorFrom({ hint: 'points:cap' }).failure).toBe('cap');
  });

  it('says not allowed for a refusal by role and unreachable for anything else', () => {
    expect(classPointsErrorFrom({ code: '42501' }).failure).toBe('not_allowed');
    expect(classPointsErrorFrom({}).failure).toBe('unreachable');
  });
});

describe('the calls', () => {
  it('asks for a chapter’s class points by its ID', async () => {
    const { client, rpc } = fakeClient({ data: classmateAnswer });
    const points = await fetchChapterClassPoints(client, 'chapter-1');
    expect(rpc).toHaveBeenCalledWith('class_chapter_points', { target_chapter_id: 'chapter-1' });
    expect(points?.giving?.left).toBe(8);
  });

  it('gives points with the line', async () => {
    const { client, rpc } = fakeClient({ data: classmateAnswer });
    await giveClassPoints(client, { chapterId: 'chapter-1', points: 2, note: 'Bravo.' });
    expect(rpc).toHaveBeenCalledWith('give_class_points', {
      target_chapter_id: 'chapter-1',
      new_points: 2,
      new_note: 'Bravo.',
    });
  });

  it('throws the refusal when the weekly budget is spent', async () => {
    const { client } = fakeClient({ error: { hint: 'points:budget' } });
    await expect(
      giveClassPoints(client, { chapterId: 'chapter-1', points: 3, note: '' }),
    ).rejects.toMatchObject({ failure: 'budget' });
  });

  it('leaves the points out when the teacher takes them away', async () => {
    const { client, rpc } = fakeClient({ data: null });
    await setTeacherPoints(client, { kind: 'reply', targetId: 'post-1', points: null, note: '' });
    const sent = rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(rpc.mock.calls[0]?.[0]).toBe('set_teacher_points');
    expect(sent).not.toHaveProperty('new_points');
  });
});
