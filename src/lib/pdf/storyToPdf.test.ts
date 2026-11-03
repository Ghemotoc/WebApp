/**
 * Tests for the shared PDF builder (bundle ADMIN-2, part d; story S1-E11-09b). The content tests
 * read the pdfmake content the converter makes; the file tests build a real PDF.
 */
import type { Content } from 'pdfmake/interfaces';
import { describe, expect, it } from 'vitest';

import type { WordAssets, WordLabels, WordPlan, WordStory } from '@/lib/word/wordTypes';

import { chapterTextToPdf } from './chapterTextToPdf';
import { planToPdf } from './planToPdf';
import { storyToPdf } from './storyToPdf';

/** English labels, as the screen would pass them. */
const labels: WordLabels = {
  byLine: (writerName) => `By ${writerName}`,
  userId: 'User ID',
  created: 'Created',
  firstPublished: 'First published',
  lastUpdated: 'Last updated',
  lastPublished: 'Last published',
  notPublishedYet: 'Not published yet',
  status: 'Status',
  chapterNumber: (position) => `Chapter ${position}`,
  pictureMissing: (altText) => `Picture: ${altText}`,
  embedLine: (title) => `Music or video: ${title}`,
  embedMissing: 'A music or video card that is no longer available',
};

/** The smallest PNG there is: one transparent pixel. */
const onePixelPng = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ),
  (character) => character.charCodeAt(0),
);

const pictureId = '3f2a0000-0000-4000-8000-000000000001';
const missingPictureId = '3f2a0000-0000-4000-8000-000000000002';
const embedId = '4e3b0000-0000-4000-8000-000000000001';

const assets: WordAssets = {
  pictures: new Map([[pictureId, { data: onePixelPng, type: 'png', width: 900, height: 300 }]]),
  embeds: new Map([[embedId, { title: 'Ploaia', url: 'https://www.youtube.com/watch?v=abc' }]]),
};

/** The converter's content for some chapter text, as JSON so it is easy to search. */
function contentJson(markdown: string): string {
  return JSON.stringify(chapterTextToPdf(markdown, { assets, labels }));
}

/** A story with two chapters. */
const story: WordStory = {
  title: 'Țara de sub ape',
  writerName: 'Lia Scrie',
  userId: '00000000-0000-4000-8000-000000000001',
  languageCode: 'ro',
  statusLabel: 'Ongoing',
  createdAt: '2026-10-01T10:00:00Z',
  firstPublishedAt: null,
  updatedAt: '2026-10-20T10:00:00Z',
  chapters: [
    {
      position: 1,
      title: 'Începutul',
      statusLabel: 'Draft',
      createdAt: '2026-10-01T10:00:00Z',
      firstPublishedAt: null,
      lastPublishedAt: null,
      markdown: `## O parte\n\nȘi **tare** și *aplecat*.\n\n![Pisica](picture:${pictureId})\n\n- unu\n- doi`,
    },
    {
      position: 2,
      title: null,
      statusLabel: 'Published',
      createdAt: '2026-10-02T10:00:00Z',
      firstPublishedAt: '2026-10-03T10:00:00Z',
      lastPublishedAt: null,
      markdown: 'Gata.',
    },
  ],
};

/** The bytes of a PDF as text, enough to find its header and its plain-text details. */
function pdfText(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes);
}

describe('chapterTextToPdf', () => {
  it('keeps bold, italic and Romanian letters', () => {
    const json = contentJson('Ă â î ș ț **tare** și *aplecat*');
    expect(json).toContain('Ă â î ș ț ');
    expect(json).toContain('"text":"tare","bold":true');
    expect(json).toContain('"text":"aplecat","bold":false,"italics":true');
  });

  it('turns headings, quotes, lists and scene breaks into the PDF’s own', () => {
    const json = contentJson('## Mare\n\n### Mică\n\n> Citat.\n\n- unu\n\n1. primul\n\n* * *');
    expect(json).toContain('"style":"heading2"');
    expect(json).toContain('"style":"heading3"');
    expect(json).toContain('"style":"quote"');
    expect(json).toContain('"ul":');
    expect(json).toContain('"ol":');
    expect(json).toContain('"text":"* * *"');
  });

  it('keeps allowed links as links and drops refused ones to plain words', () => {
    const json = contentJson('[aici](https://example.org/x) și [rău](javascript:alert(1))');
    expect(json).toContain('"link":"https://example.org/x"');
    expect(json).not.toContain('javascript:');
    expect(json).toContain('rău');
  });

  it('fits a wide picture to the page and names a missing one', () => {
    const content = chapterTextToPdf(
      `![Pisica](picture:${pictureId})\n\n![Un câine](picture:${missingPictureId})`,
      { assets, labels },
    );
    const picture = content[0] as Content & { image: string; width: number; height: number };
    expect(picture.image.startsWith('data:image/png;base64,')).toBe(true);
    expect(Math.round(picture.width)).toBe(451);
    expect(Math.round(picture.height)).toBe(150);
    expect(JSON.stringify(content[1])).toContain('Picture: Un câine');
  });

  it('lists a music or video card as a link', () => {
    const json = contentJson(`![Ploaia](embed:${embedId})`);
    expect(json).toContain('Music or video: Ploaia');
    expect(json).toContain('"link":"https://www.youtube.com/watch?v=abc"');
  });
});

describe('storyToPdf', () => {
  it('builds a real PDF in the story’s language, with its title', async () => {
    // jsdom has no Worker, which pdfmake needs to unpack a PNG, so the picture is left to the
    // browser test (e2e) and this file uses the "picture missing" line instead.
    const bytes = await storyToPdf(story, {
      labels,
      formatDate: (isoDate) => isoDate.slice(0, 10),
      assets: { pictures: new Map(), embeds: assets.embeds },
    });
    const text = pdfText(bytes);
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('/Lang (ro-RO)');
    expect(text).toContain('/DisplayDocTitle true');
  });
});

describe('planToPdf', () => {
  it('builds a real PDF for a plan, even an empty one', async () => {
    const plan: WordPlan = {
      title: 'The plan of Țara de sub ape',
      writerName: 'Lia Scrie',
      userId: '00000000-0000-4000-8000-000000000001',
      languageCode: 'en',
      parts: [],
      emptyNote: 'Nothing planned yet.',
    };
    const bytes = await planToPdf(plan, { labels });
    expect(pdfText(bytes).startsWith('%PDF-')).toBe(true);
    expect(pdfText(bytes)).toContain('/Lang (en-GB)');
  });
});
