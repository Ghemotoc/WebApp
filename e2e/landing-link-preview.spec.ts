/**
 * Link previews for shared landing pages, through the local Pages Functions (story S1-E11-14
 * criterion 13; bundle CONTESTS-13a2c).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves: the HTML of /c/<name> carries the hero's title and introduction and the theme's
 * picture as Open Graph tags, and is indexable; an unknown address carries noindex; the page
 * still opens in the browser.
 * Test data: the page /c/preview-e2e, published straight into the database, deleted afterwards.
 */
import { expect, test } from '@playwright/test';

import { runSql } from './support/database';

/** Removes this spec's page. */
const cleanUpSql = `
  delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug = 'preview-e2e');
  delete from public.landing_pages where slug = 'preview-e2e';`;

test.describe('Landing page link previews (S1-E11-14)', () => {
  test.beforeAll(() => {
    runSql(`${cleanUpSql}
      with page as (
        insert into public.landing_pages (slug, page_type) values ('preview-e2e', 'campaign') returning id
      )
      insert into public.landing_page_versions (page_id, content, status, show_from, published_at)
      select id, '{"theme": "gold", "blocks": [
        {"id": "h", "kind": "hero", "ro": {"title": "Săptămâna poeziei", "intro": "Scrie un poem pe zi."},
         "en": {"title": "Poetry week", "intro": "Write a poem a day."}},
        {"id": "t", "kind": "text", "ro": {"heading": "Cum", "body": "Simplu."}, "en": {"heading": "How", "body": "Simply."}}
      ]}'::jsonb, 'published', public.romania_today(), now()
      from page;`);
  });
  test.afterAll(() => {
    runSql(cleanUpSql);
  });

  test('a shared landing page’s HTML carries its preview and is indexable', async ({ request }) => {
    const response = await request.get('/c/preview-e2e');
    const html = await response.text();
    expect(html).toContain('<meta property="og:title" content="Săptămâna poeziei">');
    expect(html).toContain('<meta property="og:description" content="Scrie un poem pe zi.">');
    expect(html).toMatch(
      /<meta property="og:image" content="http[^"]+\/link-previews\/gold\.png">/,
    );
    expect(html).not.toContain('<meta name="robots" content="noindex">');
    expect(response.headers()['x-robots-tag']).toBeUndefined();
  });

  test('an unknown landing page address is noindex', async ({ request }) => {
    const response = await request.get('/c/nothing-here-e2e');
    expect(await response.text()).toContain('<meta name="robots" content="noindex">');
    expect(response.headers()['x-robots-tag']).toBe('noindex');
  });

  test('the page still opens in the browser', async ({ page }) => {
    await page.goto('/c/preview-e2e');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
