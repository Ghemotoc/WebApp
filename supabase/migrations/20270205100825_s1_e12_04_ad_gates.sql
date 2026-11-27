/*
 * Migration: the ad network's gates as Robert set them on 27 Nov 2026 (story S1-E12-04; bundle
 * AD-GATES, moved ahead of WIDE so ads can go on as soon as the network approves the site).
 *
 * Decided by Robert on 27 Nov 2026, 17:40 UTC (replaces his 2 Nov 2026 rule in SPONSORS-f):
 * no network ads in class spaces, for readers under 16, or on stories labelled Erotica. Every
 * other mature story gets network ads, even one with an occasional explicit scene.
 *
 * What changes:
 * - network_ads_barred(context) no longer reads stories.rating_reasons. It is true when
 *   1. the page is a story's (its story page, its chapters, its shared-link page) and one of the
 *      story's genres is an 18+ genre (the erotica genres: Erotic romance, Erotica, Erotic
 *      poetry; genres.minimum_rating = '18_plus', S1-E3-01), or
 *   2. the reader is under 16 (age_band() is under_13 or 13_to_15), or is signed in with an age
 *      we don't know yet (unknown while signed in: the safe default, rule 18).
 * - Class spaces and class-only stories stay barred by ads_are_barred(), which shows no slot at
 *   all there (S1-E12-01, Q70). Nothing changes in it.
 * - The rating reasons stay: writers still tick them and moderators read them; they just no
 *   longer switch the network off.
 *
 * Who calls it: fill_ad_slot() (through page_ads()), unchanged. Sponsor slots and our own house
 * ads are unaffected: only the network step is skipped. Tests: 425-ad-gates.test.sql.
 */

/*
 * network_ads_barred: whether the ad network must not fill a slot on this page for this reader.
 * Internal: only fill_ad_slot() calls it (execute is revoked from every client role).
 * Input: context, the page's context object (story_slug on a story's pages; see page_ads()).
 * Returns: true when the story carries an 18+ genre, or the reader is under 16 or a member whose
 *   age isn't known; false otherwise. Raises nothing.
 * Where it fits: page_ads() → fill_ad_slot() → here, before network_ad_for_slot().
 * Source: Robert, 27 Nov 2026, 17:40 UTC (ads rules); age_band() is rule 18's one age check.
 */
create or replace function public.network_ads_barred(context jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Gate 1: a story labelled Erotica, that is one of its genres is an 18+ genre.
  select exists (
      select 1
      from public.stories
      join public.genres on genres.slug = any(stories.genre_slugs)
      where stories.slug = context ->> 'story_slug'
        and genres.minimum_rating = '18_plus')
    -- Gate 2: a reader under 16. A signed-out visitor's band is unknown and isn't barred here
    -- (the app shows ads to signed-in readers only); a member whose age isn't known is.
    or public.age_band() in ('under_13', '13_to_15')
    or (auth.uid() is not null and public.age_band() = 'unknown');
$$;

comment on function public.network_ads_barred(jsonb) is
  'Internal: no network ads on a story with an 18+ (erotica) genre, or for a reader under 16 or a member of unknown age (Robert, 27 Nov 2026).';

-- Only fill_ad_slot() calls it; no client role may (as in SPONSORS-f).
revoke execute on function public.network_ads_barred(jsonb) from public, anon, authenticated;
