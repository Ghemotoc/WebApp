/**
 * Tests for competitionCertificates (bundle CLASS-POINTS, part 3; story S1-E8-17).
 */
import { describe, expect, it } from 'vitest';

import { competitionCertificateEntries } from './competitionCertificates';

describe('competitionCertificateEntries', () => {
  it('gives every entrant one certificate for their confirmed result', () => {
    const entries = competitionCertificateEntries([
      { handle: 'ana', result: 'winner', isReadersChoice: false },
      { handle: 'bogdan', result: 'finalist', isReadersChoice: false },
      { handle: 'carla', result: 'participant', isReadersChoice: false },
    ]);
    expect(entries).toEqual([
      { handle: 'ana', result: 'winner' },
      { handle: 'bogdan', result: 'finalist' },
      { handle: 'carla', result: 'participant' },
    ]);
  });

  it('adds a second certificate for a Readers’ choice entrant', () => {
    const entries = competitionCertificateEntries([
      { handle: 'carla', result: 'participant', isReadersChoice: true },
    ]);
    expect(entries).toEqual([
      { handle: 'carla', result: 'participant' },
      { handle: 'carla', result: 'readers_choice' },
    ]);
  });

  it('gives no certificate to an entrant whose result is not confirmed', () => {
    const entries = competitionCertificateEntries([
      { handle: 'dan', result: null, isReadersChoice: true },
    ]);
    expect(entries).toEqual([]);
  });
});
