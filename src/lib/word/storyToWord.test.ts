/**
 * Tests for the shared Word builder (story S1-E13-02; the format rules of S1-E11-09). Each test
 * builds a real .docx and reads its XML back, as Word would.
 */
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { storyToWord } from './storyToWord';
import type { WordAssets, WordLabels, WordStory } from './wordTypes';

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
  pictures: new Map([[pictureId, { data: onePixelPng, type: 'png', width: 10, height: 10 }]]),
  embeds: new Map([[embedId, { title: 'Ploaia', url: 'https://www.youtube.com/watch?v=abc' }]]),
};

/** A story with two chapters that use every allowed piece of the text. */
function storyWith(chapterText: string): WordStory {
  return {
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
        markdown: chapterText,
      },
      {
        position: 2,
        title: null,
        statusLabel: 'Published',
        createdAt: '2026-10-02T10:00:00Z',
        firstPublishedAt: '2026-10-03T10:00:00Z',
        lastPublishedAt: '2026-10-04T10:00:00Z',
        markdown: 'Gata.',
      },
    ],
  };
}

/** Builds the file and answers its main XML parts as text. */
async function wordXml(chapterText: string) {
  const bytes = await storyToWord(storyWith(chapterText), {
    labels,
    formatDate: (isoDate) => isoDate.slice(0, 10),
    assets,
  });
  const zip = await JSZip.loadAsync(bytes);
  const read = async (path: string) => (await zip.file(path)?.async('string')) ?? '';
  return {
    document: await read('word/document.xml'),
    styles: await read('word/styles.xml'),
    core: await read('docProps/core.xml'),
  };
}

describe('storyToWord', () => {
  it('starts with the title, the pen name, the user ID, the dates and the status', async () => {
    const { document } = await wordXml('Text.');
    expect(document).toContain('<w:pStyle w:val="Title"/>');
    expect(document).toContain('Țara de sub ape');
    expect(document).toContain('By Lia Scrie');
    expect(document).toContain('00000000-0000-4000-8000-000000000001');
    expect(document).toContain('2026-10-01');
    expect(document).toContain('Not published yet');
    expect(document).toContain('Ongoing');
  });

  it('keeps Romanian letters and marks the document as Romanian', async () => {
    const { document, styles } = await wordXml('Ă â î ș ț și Ș Ț.');
    expect(document).toContain('Ă â î ș ț și Ș Ț.');
    expect(styles).toContain('w:val="ro-RO"');
  });

  it('gives every chapter a real heading in order, with its status and dates', async () => {
    const { document } = await wordXml('Text.');
    expect(document.match(/<w:pStyle w:val="Heading1"\/>/g)).toHaveLength(2);
    expect(document.indexOf('Chapter 1: Începutul')).toBeLessThan(document.indexOf('Chapter 2'));
    expect(document).toContain(
      'Status: Published · Created: 2026-10-02 · First published: 2026-10-03 · Last published: 2026-10-04',
    );
  });

  it('turns the text’s headings, bold, italic, quotes, lists and scene breaks into Word’s own', async () => {
    const { document } = await wordXml(
      '## O parte\n\n### Mai mică\n\n**tare** și *aplecat*\n\n> Citat.\n\n- unu\n- doi\n\n1. primul\n\n* * *',
    );
    expect(document).toContain('<w:pStyle w:val="Heading2"/>');
    expect(document).toContain('<w:pStyle w:val="Heading3"/>');
    expect(document).toContain('<w:b/>');
    expect(document).toContain('<w:i/>');
    expect(document).toContain('<w:pStyle w:val="Quote"/>');
    expect(document.match(/<w:numPr>/g)).toHaveLength(3);
    expect(document).toContain('* * *');
  });

  it('keeps links as links', async () => {
    const { document } = await wordXml('Vezi [aici](https://example.org/x).');
    expect(document).toContain('<w:hyperlink');
    expect(document).toContain('aici');
  });

  it('includes a picture with its alt text, and says which picture is missing when it can’t', async () => {
    const { document } = await wordXml(
      `![O pisică pe gard](picture:${pictureId})\n\n![Un câine](picture:${missingPictureId})`,
    );
    expect(document).toContain('descr="O pisică pe gard"');
    expect(document).toContain('Picture: Un câine');
  });

  it('lists a music or video card as a link', async () => {
    const { document } = await wordXml(`![Ploaia](embed:${embedId})`);
    expect(document).toContain('Music or video: Ploaia');
    expect(document).toContain('<w:hyperlink');
  });

  it('names the story and the writer in the file’s properties', async () => {
    const { core } = await wordXml('Text.');
    expect(core).toContain('Țara de sub ape');
    expect(core).toContain('Lia Scrie');
  });
});
