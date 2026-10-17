/**
 * Tests for reading a stored legal text: splitting it into parts, filling the brand values and
 * choosing the version and language to show (story S1-E14-01).
 */
import { describe, expect, it } from 'vitest';

import { brand } from '@/config/brand';

import type { LegalVersion } from '../api/legalDocuments';

import { chooseLegalVersion } from './chooseLegalVersion';
import { fillBrandTokens } from './fillBrandTokens';
import { formatLegalDate } from './legalDocumentList';
import { splitPlaceholders } from './legalMarks';
import { parseLegalDocument } from './parseLegalDocument';

const storedBody = [
  '## In short',
  '',
  '- The agreement with {{productName}}.',
  '',
  '## 1. Who can join',
  '',
  '**In short** (as on the board)',
  '',
  '- You must be 13 or older.',
  '',
  '**Full text**',
  '',
  'The full text.',
  '',
  '## Proposed additional sections (not on the board yet)',
  '',
  'These sections cover points the board has no place for.',
  '',
  '## 9. Your account {{afterTheInvitedTest}}',
  '',
  '**Pe scurt** (propus)',
  '',
  '- Short.',
  '',
  '**Text complet**',
  '',
  'Long.',
].join('\n');

describe('parseLegalDocument', () => {
  const parsed = parseLegalDocument(storedBody);

  it('keeps the document summary apart from the sections', () => {
    expect(parsed.summaryMarkdown).toBe('- The agreement with {{productName}}.');
    expect(parsed.sections).toHaveLength(3);
  });

  it('splits a numbered section into its short version and full text', () => {
    expect(parsed.sections[0]).toMatchObject({
      number: 1,
      title: 'Who can join',
      shortMarkdown: '- You must be 13 or older.',
      fullMarkdown: 'The full text.',
      isProposed: false,
      isAfterTheTest: false,
    });
  });

  it('treats the "Proposed additional sections" introduction as a note', () => {
    expect(parsed.sections[1]).toMatchObject({ number: null, shortMarkdown: '' });
  });

  it('reads the Romanian markers, a proposed section and a section that applies after the test', () => {
    expect(parsed.sections[2]).toMatchObject({
      number: 9,
      title: 'Your account',
      isProposed: true,
      isAfterTheTest: true,
      shortMarkdown: '- Short.',
      fullMarkdown: 'Long.',
    });
  });
});

describe('fillBrandTokens', () => {
  it('fills every token from the brand config, so renaming the product needs no new text', () => {
    const filled = fillBrandTokens('{{productName}}, {{companyName}}', brand);
    expect(filled).toBe(`${brand.productName}, ${brand.companyName}`);
  });

  it('turns every address into an email link (S1-E14-02)', () => {
    const filled = fillBrandTokens('{{contactEmail}} {{privacyEmail}} {{authoritiesEmail}}', brand);
    expect(filled).toBe(
      [brand.contactEmail, brand.privacyEmail, brand.authoritiesEmail]
        .map((address) => `[${address}](mailto:${address})`)
        .join(' '),
    );
  });
});

describe('splitPlaceholders', () => {
  it('highlights a placeholder still to be decided', () => {
    const pieces = splitPlaceholders('Notice period: [number] days.');
    expect(pieces).toHaveLength(3);
    expect(pieces[1]).toMatchObject({ type: 'emphasis', data: { hName: 'mark' } });
  });

  it('leaves quoted words in brackets alone, such as the moderation marker', () => {
    expect(splitPlaceholders('leaving a “[Removed by the moderation team]” marker')).toEqual([
      { type: 'text', value: 'leaving a “[Removed by the moderation team]” marker' },
    ]);
  });
});

/** A version row as the database returns it. */
function makeVersion(label: string, language: string, publishedAt: string): LegalVersion {
  return {
    id: `${label}-${language}`,
    version_label: label,
    language,
    title: 'Terms of use',
    body_markdown: '## In short',
    change_summary: null,
    is_lawyer_reviewed: false,
    published_at: publishedAt,
  };
}

describe('chooseLegalVersion', () => {
  const versions = [
    makeVersion('0.2', 'en', '2026-11-01T00:00:00Z'),
    makeVersion('0.1', 'ro', '2026-10-17T12:00:00Z'),
    makeVersion('0.1', 'en', '2026-10-17T12:00:00Z'),
  ];

  it('shows the newest version in the reader’s language when it exists', () => {
    const chosen = chooseLegalVersion(versions.slice(1), 'ro');
    expect(chosen.current?.id).toBe('0.1-ro');
    expect(chosen.isFallbackLanguage).toBe(false);
  });

  it('falls back to English, and says so, when the newest version has no text in the reader’s language', () => {
    const chosen = chooseLegalVersion(versions, 'ro');
    expect(chosen.current?.id).toBe('0.2-en');
    expect(chosen.isFallbackLanguage).toBe(true);
  });

  it('lists every version once, newest first, with its languages', () => {
    expect(chooseLegalVersion(versions, 'en').history).toEqual([
      {
        versionLabel: '0.2',
        publishedAt: '2026-11-01T00:00:00Z',
        languages: ['en'],
        isLawyerReviewed: false,
      },
      {
        versionLabel: '0.1',
        publishedAt: '2026-10-17T12:00:00Z',
        languages: ['ro', 'en'],
        isLawyerReviewed: false,
      },
    ]);
  });

  it('has nothing to show for a document without versions', () => {
    expect(chooseLegalVersion([], 'ro').current).toBeNull();
  });
});

describe('formatLegalDate', () => {
  it('writes dates the Romanian way and the British way, in Romanian time', () => {
    expect(formatLegalDate('2026-10-17T12:00:00Z', 'ro')).toBe('17 octombrie 2026');
    expect(formatLegalDate('2026-10-17T12:00:00Z', 'en')).toBe('17 October 2026');
  });
});
