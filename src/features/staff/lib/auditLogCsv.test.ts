/**
 * Unit tests for the audit log CSV builder (story S1-E11-01).
 */
import { describe, expect, it } from 'vitest';

import type { AuditLogEntry } from '../api/auditLog';

import { auditLogToCsv, csvCell } from './auditLogCsv';

/** One entry with every kind of awkward value. */
const entry: AuditLogEntry = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-10-23T10:00:00+00:00',
  actor: 'person',
  staffHandle: 'admin',
  actorUserIdShort: '00000000',
  action: 'staff.role_granted',
  targetType: 'staff_roles',
  targetId: null,
  targetHandle: 'teacher',
  targetUserIdShort: '00000000',
  reason: 'Joins support, "for now"\nsecond line',
  beforeValues: null,
  afterValues: { role: 'support', note: 'ș și ț' },
};

describe('csvCell', () => {
  it('leaves a plain value alone and empties a null', () => {
    expect(csvCell('staff.role_granted')).toBe('staff.role_granted');
    expect(csvCell(null)).toBe('');
  });

  it('quotes a value with a comma, a quote or a line break and doubles the quotes', () => {
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });
});

describe('auditLogToCsv', () => {
  it('writes a header, then one line per entry, with a byte order mark for Excel', () => {
    const csv = auditLogToCsv([entry]);
    const lines = csv.split('\r\n');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lines[0]).toBe(
      '\uFEFFtime,staff,actor,actor_user_id_short,action,target_type,target_id,target_account,target_user_id_short,reason,before,after',
    );
    expect(lines[1]).toBe(
      '2026-10-23T10:00:00+00:00,admin,person,00000000,staff.role_granted,staff_roles,,teacher,00000000,' +
        '"Joins support, ""for now""\nsecond line",,"{""role"":""support"",""note"":""ș și ț""}"',
    );
    expect(lines[2]).toBe('');
  });

  it('keeps Romanian letters as they are', () => {
    expect(auditLogToCsv([entry])).toContain('ș și ț');
  });
});
