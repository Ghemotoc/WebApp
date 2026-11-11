/**
 * Tests for writing certificates on the screen side (bundle CLASSES, part e; story S1-E8-12):
 * reading the student's list, saving the printed name, the public check and the teacher's and
 * staff's calls. Supabase is a small fake here; the database rules are in
 * supabase/tests/database/236-certificates.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  certificateCheckFrom,
  certificateErrorFrom,
  listMyCertificates,
  setPrintedName,
  verifyCertificate,
} from './certificates';
import {
  findStaffCertificate,
  issueClassCertificates,
  listClassCertificates,
  revokeCertificate,
} from './classCertificates';

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

/** One row as my_certificates() answers it. */
const ownRow = {
  id: 'c1',
  code: 'CL27-7K4M-Q9',
  programme_name: 'Cercul de scriere',
  result: 'winner',
  class_name: 'Clasa a VII-a',
  school_name: 'Școala nr. 3',
  teacher_name: 'Doamna Ionescu',
  signed_at: '2027-06-01T09:00:00Z',
  is_revoked: false,
  printed_name: null,
  pen_name: 'Ana Scrie',
  name_deleted_on: null,
  signatory_name: 'The signatory',
};

describe('certificateErrorFrom', () => {
  it('reads "only the teacher signs" from its hint', () => {
    expect(certificateErrorFrom({ hint: 'certificate:teacher_only' }).failure).toBe('teacher_only');
  });

  it('treats a refusal without a hint as not allowed', () => {
    expect(certificateErrorFrom({ code: '42501' }).failure).toBe('not_allowed');
  });

  it('falls back to "couldn’t reach the server" for anything else', () => {
    expect(certificateErrorFrom({ hint: null }).failure).toBe('unreachable');
  });
});

describe('the student’s certificates', () => {
  it('a certificate without a typed name keeps the pen name for printing', async () => {
    const { client } = fakeClient({ data: [ownRow] });
    const [certificate] = await listMyCertificates(client);
    expect(certificate?.printedName).toBeNull();
    expect(certificate?.penName).toBe('Ana Scrie');
    expect(certificate?.result).toBe('winner');
  });

  it('a class certificate is not a contest one', async () => {
    const { client } = fakeClient({ data: [ownRow] });
    const [certificate] = await listMyCertificates(client);
    expect(certificate?.isContest).toBe(false);
    expect(certificate?.contestName).toBeNull();
  });

  it('a contest certificate carries the contest’s name in both languages', async () => {
    const contestRow = {
      ...ownRow,
      class_name: null,
      teacher_name: null,
      school_name: null,
      is_contest: true,
      contest_name: { ro: 'Concursul de toamnă', en: 'The autumn contest' },
    };
    const { client } = fakeClient({ data: [contestRow] });
    const [certificate] = await listMyCertificates(client);
    expect(certificate?.isContest).toBe(true);
    expect(certificate?.contestName).toEqual({
      ro: 'Concursul de toamnă',
      en: 'The autumn contest',
    });
    expect(certificate?.schoolName).toBeNull();
  });

  it('saving a name sends only the certificate and the name', async () => {
    const { client, rpc } = fakeClient({ data: { printed_name: 'Ana Popescu' } });
    await expect(
      setPrintedName(client, { certificateId: 'c1', printedName: 'Ana Popescu' }),
    ).resolves.toBe('Ana Popescu');
    expect(rpc).toHaveBeenCalledWith('set_certificate_printed_name', {
      certificate_id: 'c1',
      printed_name: 'Ana Popescu',
    });
  });

  it('a name typed after the 30 days is refused in plain words', async () => {
    const { client } = fakeClient({ error: { hint: 'certificate:name_deleted' } });
    await expect(
      setPrintedName(client, { certificateId: 'c1', printedName: 'Ana' }),
    ).rejects.toMatchObject({ failure: 'name_deleted' });
  });
});

describe('the public check', () => {
  it('a valid code shows the programme and the result, never a name', async () => {
    const { client } = fakeClient({
      data: { status: 'valid', programme_name: 'Cercul', result: 'finalist', school_name: null },
    });
    const check = await verifyCertificate(client, 'cl27 7k4m q9');
    expect(check).toMatchObject({ status: 'valid', programmeName: 'Cercul', result: 'finalist' });
    expect(JSON.stringify(check)).not.toContain('name"');
  });

  it('a certificate deleted with its account reads as no longer available', () => {
    expect(certificateCheckFrom({ status: 'retired' }).status).toBe('retired');
  });

  it('anything unexpected reads as unknown', () => {
    expect(certificateCheckFrom({ status: 'odd' }).status).toBe('unknown');
  });
});

describe('the teacher and staff', () => {
  it('the teacher’s list shows each student by name, without a printed name', async () => {
    const { client } = fakeClient({
      data: [
        {
          student: { handle: 'ana', display_name: 'Ana Scrie' },
          programme_name: 'Cercul',
          result: 'participant',
          code: 'CL27-AAAA-AA',
          signed_at: '2027-06-01T09:00:00Z',
          is_revoked: false,
        },
      ],
    });
    const [row] = await listClassCertificates(client, 'clasa');
    expect(row).toMatchObject({ studentName: 'Ana Scrie', result: 'participant' });
  });

  it('approving sends one result per student and the look, and returns how many changed', async () => {
    const { client, rpc } = fakeClient({ data: { issued: 2 } });
    const issued = await issueClassCertificates(client, {
      slug: 'clasa',
      programmeName: 'Cercul',
      results: [{ handle: 'ana', result: 'winner' }],
      look: { colour: 'sea_glass', pattern: 'waves' },
    });
    expect(issued).toBe(2);
    expect(rpc).toHaveBeenCalledWith('issue_class_certificates', {
      slug: 'clasa',
      programme_name: 'Cercul',
      results: [{ handle: 'ana', result: 'winner' }],
      look: { colour: 'sea_glass', pattern: 'waves' },
    });
  });

  it('a certificate reads its look, and an unknown one falls back to Plum with no pattern', async () => {
    const { client } = fakeClient({
      data: [
        {
          id: 'a',
          code: 'A',
          programme_name: 'P',
          result: 'winner',
          signed_at: 'x',
          look_colour: 'cobalt',
          look_pattern: 'rings',
        },
        {
          id: 'b',
          code: 'B',
          programme_name: 'P',
          result: 'winner',
          signed_at: 'x',
          look_colour: 'neon',
          look_pattern: 'zigzag',
        },
      ],
    });
    const [chosen, unknown] = await listMyCertificates(client);
    expect(chosen?.look).toEqual({ colour: 'cobalt', pattern: 'rings' });
    expect(unknown?.look).toEqual({ colour: 'plum', pattern: 'none' });
  });

  it('a refused look is named in plain words', async () => {
    const { client } = fakeClient({ error: { hint: 'certificate:look' } });
    await expect(
      issueClassCertificates(client, {
        slug: 'clasa',
        programmeName: 'Cercul',
        results: [{ handle: 'ana', result: 'winner' }],
        look: { colour: 'plum', pattern: 'none' },
      }),
    ).rejects.toMatchObject({ failure: 'look' });
  });

  it('staff get null for a code with no certificate', async () => {
    const { client } = fakeClient({ data: null });
    await expect(findStaffCertificate(client, 'CL27-AAAA-AA')).resolves.toBeNull();
  });

  it('revoking twice is refused in plain words', async () => {
    const { client } = fakeClient({ error: { hint: 'certificate:revoked' } });
    await expect(revokeCertificate(client, { code: 'x', reason: 'y' })).rejects.toMatchObject({
      failure: 'revoked',
    });
  });
});
