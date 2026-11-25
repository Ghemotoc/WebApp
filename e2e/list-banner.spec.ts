/**
 * The banner among a See all list's stories (user stories 1.5, 1.6 and 1.9; boards A05-ReadList,
 * A06-ReadGenre and A09-ReadTag; Robert, 20 Nov 2026: "a banner every two rows").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves, on a tag page with 14 stories:
 * - the list's ad is a wide banner as wide as the grid, never a card in one cell;
 * - it sits after two rows of five on a computer (the 10th story), after three rows of four on a
 *   tablet (the 12th) and after the 10th story on a phone, so it always falls between full rows;
 * - the page with its banner passes axe and doesn't scroll sideways at 390, 768 and 1440 px, by
 *   day and at night, in both languages (CLAUDE.md rule 21).
 * Test data: 14 published stories by the adult_writer persona, each with the tag "banner-e2e",
 * removed afterwards. Pages are opened signed in as the ad reader (only signed-in readers see ads).
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { rememberAdReaderLanguage, signInAdReader } from './support/adReader';
import { runSql } from './support/database';

/** The tag every story here carries. */
const tag = 'banner-e2e';

/** The tag page, with every language so the Romanian test stories show to an English reader. */
const tagAddress = `/discover/t/${tag}?language=any`;

/** How many stories the tag holds: more than two rows of five and three rows of four. */
const storyCount = 14;

/** Removes the stories and the tag this spec made. */
function cleanUp(): void {
  runSql(`delete from public.stories where slug like 'banner-e2e-%';
    delete from public.tags where normalised_name = '${tag}';`);
}

/** 14 readable stories, each with one published chapter and the tag. */
function seedStories(): void {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    select '00000000-0000-4000-8000-000000000001', 'banner-e2e-' || number, 'Banner ' || number,
      'x', 'ro', (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages',
      now() - make_interval(hours => number), now()
    from generate_series(1, ${storyCount}) as number;
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'bnrbnr' || lpad(substr(slug, 12), 2, '0'), 1, 'Unu', 'x', 1, 'published',
      'Unu', 'Text.', 1, now()
    from public.stories where slug like 'banner-e2e-%';
    insert into public.tags (name, normalised_name, status) values ('${tag}', '${tag}', 'approved');
    insert into public.story_tags (story_id, tag_id, user_id)
    select stories.id, tags.id, stories.user_id from public.stories, public.tags
    where stories.slug like 'banner-e2e-%' and tags.normalised_name = '${tag}';`);
}

/**
 * Where the banner sits: how many stories come before it in the grid, and whether it is as wide
 * as the grid.
 *
 * @param page - the tag page, loaded
 * @returns the stories before the banner and whether it fills the row
 */
async function bannerPlace(page: Page): Promise<{ storiesBefore: number; fillsRow: boolean }> {
  const banner = page.locator('[data-ad="wide"]').first();
  await expect(banner).toBeVisible();
  return banner.evaluate((ad) => {
    const item = ad.closest('li');
    const grid = item?.parentElement ?? null;
    if (item === null || grid === null) return { storiesBefore: -1, fillsRow: false };
    return {
      storiesBefore: Array.from(grid.children).indexOf(item),
      fillsRow: item.clientWidth === grid.clientWidth,
    };
  });
}

test.describe('the banner among a list of stories (user stories 1.5 and 1.9)', () => {
  test.describe.configure({ mode: 'serial' });
  let putLanguageBack: () => void = () => undefined;
  test.beforeAll(() => {
    seedStories();
    putLanguageBack = rememberAdReaderLanguage();
  });
  test.afterAll(() => {
    putLanguageBack();
    cleanUp();
  });

  /** Each width with the story the banner should follow there. */
  const placesByWidth: [number, number][] = [
    [1440, 10],
    [768, 12],
    [390, 10],
  ];
  for (const [width, storiesBefore] of placesByWidth) {
    test(`at ${width} px the banner fills the row after story ${storiesBefore}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await signInAdReader(page.context(), 'en');
      await page.goto(tagAddress);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(tag);
      expect(await bannerPlace(page)).toEqual({ storiesBefore, fillsRow: true });
    });
  }

  for (const view of everyView([tagAddress])) {
    test(`the tag page with its banner passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await signInAdReader(page.context(), view.language);
      await checkScreen(page, view);
      await expect(page.locator('[data-ad="wide"]').first()).toBeVisible();
    });
  }
});
