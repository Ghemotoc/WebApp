/**
 * Tests for preparing the legal drafts for the database (story S1-E14-01).
 * They prove the drafts reach the database without the lawyer-only sections, with every
 * after-the-test line marked and no brand value left in them, and that no word is changed.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { brandDefaults } from '../../src/config/brand';
import { buildLegalMigration, legalDraftFiles, marksFor } from '../build-legal-migration';

import {
  afterTheInvitedTestMarker,
  findLinesForPassage,
  markLinesAfterTheTest,
  prepareLegalText,
  replaceBrandValues,
  splitDraft,
} from './prepare-legal-text';

const contentFolder = fileURLToPath(new URL('../../content/legal', import.meta.url));

/** A small draft shaped like the real ones. */
const sampleDraft = [
  '# Terms of use',
  '',
  '**Draft for lawyer review**',
  '',
  '## In short',
  '',
  `- This is the agreement with ${brandDefaults.productName}.`,
  '',
  '## 1. Who can join',
  '',
  '**In short** (as on the board)',
  '',
  '- You must be 13 or older.',
  '',
  '**Full text**',
  '',
  'You must be 13 or older. Write to [privacy email] or ' + brandDefaults.contactEmail + '.',
  '',
  '## Drafting notes for the lawyer',
  '',
  '- Secret note.',
].join('\n');

describe('splitDraft', () => {
  it('keeps the title and the readable text, and leaves out the notes for the lawyer', () => {
    const { title, bodyMarkdown } = splitDraft(sampleDraft);
    expect(title).toBe('Terms of use');
    expect(bodyMarkdown.startsWith('## In short')).toBe(true);
    expect(bodyMarkdown).not.toContain('Drafting notes');
    expect(bodyMarkdown).not.toContain('Secret note');
    expect(bodyMarkdown).not.toContain('Draft for lawyer review');
  });

  it('refuses a draft without a title', () => {
    expect(() => splitDraft('## In short')).toThrow('title');
  });
});

describe('marking the lines that apply after the invited test', () => {
  const lines = [
    '- You must be 13 or older.',
    'You must be 13 or older. If you’re younger, you can’t.',
  ];

  it('marks the line that equals a passage, even when another line contains it', () => {
    expect(findLinesForPassage(lines, 'You must be 13 or older.')).toEqual([0]);
  });

  it('marks the one line that contains a passage', () => {
    expect(findLinesForPassage(lines, 'If you’re younger')).toEqual([1]);
  });

  it('refuses a passage that is not in the draft, so a typo never goes unnoticed', () => {
    expect(() => findLinesForPassage(lines, 'Not there')).toThrow('is not in the draft');
  });

  it('puts the marker after the list dash and at the end of a marked section heading', () => {
    const body = '## 1. Who can join\n\n- You must be 13 or older.\n';
    const marked = markLinesAfterTheTest(body, {
      sections: [1],
      passages: ['You must be 13 or older.'],
    });
    expect(marked).toContain(`## 1. Who can join ${afterTheInvitedTestMarker}`);
    expect(marked).toContain(`- ${afterTheInvitedTestMarker} You must be 13 or older.`);
  });
});

describe('replaceBrandValues', () => {
  it('swaps the brand values and the privacy placeholder for tokens', () => {
    const text = `${brandDefaults.productName} by ${brandDefaults.companyName}: ${brandDefaults.contactEmail}, [privacy email]`;
    expect(replaceBrandValues(text)).toBe(
      '{{productName}} by {{companyName}}: {{contactEmail}}, {{privacyEmail}}',
    );
  });
});

describe('the real drafts in content/legal', () => {
  const marksFile = JSON.parse(
    readFileSync(`${contentFolder}/after-the-invited-test.json`, 'utf8'),
  );

  it.each(Object.entries(legalDraftFiles).filter(([slug]) => slug !== 'contact'))(
    'the %s draft prepares in English and Romanian with every after-the-test passage found',
    (slug, fileName) => {
      for (const [language, folder] of [
        ['en', ''],
        ['ro', 'ro/'],
      ] as const) {
        const draft = readFileSync(`${contentFolder}/${folder}${fileName}`, 'utf8');
        const prepared = prepareLegalText(draft, marksFor(marksFile, slug, language));
        expect(prepared.bodyMarkdown.toLowerCase()).not.toContain(
          brandDefaults.productName.toLowerCase(),
        );
        expect(prepared.bodyMarkdown).not.toContain('Drafting notes for the lawyer');
      }
    },
  );

  it('changes no word: removing the markers and filling the tokens gives back the draft text', () => {
    const draft = readFileSync(`${contentFolder}/01-terms-of-use.md`, 'utf8');
    const prepared = prepareLegalText(draft, marksFor(marksFile, 'terms', 'en'));
    const restored = prepared.bodyMarkdown
      .split(` ${afterTheInvitedTestMarker}`)
      .join('')
      .split(`${afterTheInvitedTestMarker} `)
      .join('')
      .split('{{productName}}')
      .join(brandDefaults.productName)
      .split('{{companyName}}')
      .join(brandDefaults.companyName)
      .split('{{contactEmail}}')
      .join(brandDefaults.contactEmail);
    expect(draft).toContain(restored.trim());
  });

  it('builds the migration without a single brand value in it', () => {
    const sql = buildLegalMigration(
      {
        versionLabel: '0.1',
        publishedAt: '2026-10-17T12:00:00Z',
        isMaterial: true,
        documentSlugs: ['terms', 'privacy', 'guidelines'],
      },
      contentFolder,
    );
    expect(sql.match(/insert into public\.legal_document_versions/g)).toHaveLength(6);
    expect(sql.toLowerCase()).not.toContain(brandDefaults.productName.toLowerCase());
    expect(sql.toLowerCase()).not.toContain(brandDefaults.contactEmail);
  });
});
