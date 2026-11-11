/** Tests for one page as Staff › Website › Search and sharing shows it (S1-E11-39). */
import { describe, expect, it } from 'vitest';

import { searchPageReportOf } from './searchPageReport';

describe('a page on the Search and sharing screen', () => {
  it('shows the home page with the site’s share picture and its name alone as the result title', () => {
    const report = searchPageReportOf({
      page_kind: 'home_page',
      market_code: 'RO',
      language_code: 'ro',
      address: '/',
      content: { headlineFirst: 'Scrie.', headlineSecond: 'Citește.', lede: '' },
    });
    expect(report?.sharePicture).toBe('/link-previews/share.png');
    expect(report?.resultTitle).toEqual({ lead: '', withSiteName: true });
    expect(report?.warnings).toEqual(['title_short', 'no_description']);
  });

  it('puts a help page’s search title before the site’s name', () => {
    const report = searchPageReportOf({
      page_kind: 'help_page',
      market_code: 'RO',
      language_code: 'en',
      address: '/help/reporting',
      content: {
        title: 'Reporting',
        body: 'Text.',
        search: { title: 'How to report a story or a comment' },
      },
    });
    expect(report?.resultTitle).toEqual({
      lead: 'How to report a story or a comment',
      withSiteName: true,
    });
    // The page still shows its own title as its one main heading.
    expect(report?.warnings).not.toContain('main_heading_count');
  });

  it('gives a landing page its theme’s card and flags a picture without alt text in one language', () => {
    const report = searchPageReportOf({
      page_kind: 'landing_page',
      market_code: null,
      language_code: 'ro',
      address: '/c/toamna',
      content: {
        theme: 'sage',
        blocks: [
          {
            kind: 'hero',
            picture_id: 'p1',
            ro: { title: 'Concursul de toamnă', intro: 'Scrie.', alt: 'Frunze' },
            en: { alt: '' },
          },
        ],
      },
    });
    expect(report?.sharePicture).toBe('/link-previews/sage.png');
    expect(report?.resultTitle.withSiteName).toBe(false);
    expect(report?.warnings).toContain('picture_without_alt');
  });

  it('flags a landing page with no hero title for its missing main heading, and uses plum for an unknown theme', () => {
    const report = searchPageReportOf({
      page_kind: 'landing_page',
      market_code: null,
      language_code: 'ro',
      address: '/c/gol',
      content: { theme: 'neon', blocks: [] },
    });
    expect(report?.sharePicture).toBe('/link-previews/plum.png');
    expect(report?.warnings).toContain('main_heading_count');
  });

  it('leaves out a kind it doesn’t know', () => {
    expect(
      searchPageReportOf({
        page_kind: 'notice',
        market_code: 'RO',
        language_code: 'ro',
        address: '/',
        content: {},
      }),
    ).toBeNull();
  });
});

describe('stored content that is broken', () => {
  it('a landing page whose blocks are not a list, or hold empty slots, still gets a row', () => {
    // SEO-1d break test: one bad version must not take down the whole screen.
    const brokenContents: unknown[] = [
      { blocks: 'not a list' },
      { blocks: [null, 3, { kind: 'hero', ro: null }] },
      { search: 'not an object', theme: 42 },
      null,
    ];
    for (const content of brokenContents) {
      const report = searchPageReportOf({
        page_kind: 'landing_page',
        market_code: null,
        language_code: 'ro',
        address: '/c/broken',
        content,
      });
      expect(report?.sharePicture).toBe('/link-previews/plum.png');
      expect(report?.warnings).toContain('main_heading_count');
    }
  });
});
