/*
 * Migration: genres, the bookshop genres a writer picks for a story (story S1-E3-01, Create a
 * story; Robert, 26 Nov 2026, 20:34 UTC: "I also want in the categories to have all the genres
 * for people to select from. They can start from typing and then one pops up. By all genres, I
 * mean the ones that are known everywhere, not just in indie literary sense, but like in
 * bookshops and stuff.").
 *
 * What it adds:
 * - genres: the fixed list of mainstream genres (170), drawn from the BISAC subject
 *   headings bookshops shelve by (FICTION, JUVENILE FICTION, YOUNG ADULT FICTION, POETRY, DRAMA
 *   and the nonfiction headings closest to essays and memoir), with an English and a Romanian
 *   name. The three categories (fiction, poetry, nonfiction essays; Q52) stay the broad choice;
 *   a genre sits beside the category and doesn't depend on it, so a poem for children can be
 *   both Poetry and "Poetry for children".
 * - genres.minimum_rating: the youngest rating a story with this genre may carry. Erotica,
 *   erotic romance and erotic poetry are 18+ only; every other genre is for all ages.
 * - stories.genre_slugs: up to three genres per story, as their slugs (the same shape as
 *   stories.set_in_countries, CALM-9), so no new user table, export or deletion rule is needed.
 * - set_my_story_genres(): the writer's own choice, from the new story wizard and story
 *   settings, written to every edition of the story (TRANSLATE-1a: editions are one story).
 * - A trigger that takes an 18+ genre off any story that isn't rated 18+, whoever changes the
 *   rating (the writer or staff), so an adult genre only ever sits on an 18+ story.
 * - story_list_genres(): the genres Discover's filter offers, only those used by stories this
 *   reader may see (Robert's rule for the language filter, applied to genres).
 * - browse_stories() gains a genre_slug filter.
 *
 * How the 18+ genres stay away from under-18s, in the database (CLAUDE.md rule 18, age_band()):
 * 1. genres_select_public lets a person read an 18+ genre only when rating_allows('18_plus'),
 *    which reads age_band(); an under-18 writer is never offered one, and the wizard's list
 *    comes from this table.
 * 2. set_my_story_genres() refuses a genre the caller may not read (the same rule), and an 18+
 *    genre on a story that isn't rated 18+.
 * 3. The trigger keeps 18+ genres only on 18+ stories, and an 18+ story is hidden from anyone
 *    under 18 by every reader path (listed_stories(), rating_allows()).
 * 4. story_list_genres() counts only stories the reader may see and genres they may read.
 *
 * Who calls it: src/features/writing/api/genres.ts (the list and the save) and
 * src/features/discovery/api/storyLists.ts (the filter).
 * Tests: supabase/tests/database/420-genres.test.sql.
 * Personal data: none; a genre describes a story, not its writer.
 */

/* ---------- 1. The genres ---------- */

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  -- The fixed key the address and the filter use ("epic_fantasy").
  slug text not null unique,
  -- Which shelf of the bookshop it comes from, for the order the list shows them in:
  -- fiction, young_adult, children, poetry, drama or nonfiction.
  group_key text not null,
  -- The names readers and writers see. Genres are data, like tags, so they don't load with the
  -- app's interface text; other interface languages show the English name until they have one.
  name_en text not null,
  name_ro text not null,
  -- The youngest rating a story with this genre may carry (18+ for the erotic genres).
  minimum_rating public.story_rating not null default 'all_ages',
  -- The order inside the list.
  position smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint genres_slug_is_a_key check (slug ~ '^[a-z_]{2,40}$'),
  constraint genres_group_is_known check (
    group_key in ('fiction', 'young_adult', 'children', 'poetry', 'drama', 'nonfiction')),
  constraint genres_names_length check (
    char_length(name_en) between 2 and 60 and char_length(name_ro) between 2 and 60)
);

comment on table public.genres is
  'kind: platform
The bookshop genres a writer picks for a story, with English and Romanian names; 18+ genres only for 18+ stories (S1-E3-01, Robert 26 Nov 2026).';

create trigger genres_set_updated_at
  before update on public.genres
  for each row execute function public.set_updated_at();

alter table public.genres enable row level security;

/**
 * Policy genres_select_public: anyone, signed out included, reads the genres their age allows.
 * Why: the new story wizard and Discover's filter list them; an 18+ genre (erotica) is read only
 * by someone rating_allows() lets see an 18+ story, which reads age_band() (rule 18), so an
 * under-18 writer or reader never sees it offered.
 */
create policy genres_select_public
  on public.genres
  for select
  to anon, authenticated
  using (minimum_rating = 'all_ages' or public.rating_allows(minimum_rating));

comment on policy genres_select_public on public.genres is
  'Allows anyone to read the genres; an 18+ genre only for someone old enough to read 18+ stories (rule 18, age_band()).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): anyone may read.
revoke all on public.genres from anon, authenticated;
grant select on public.genres to anon, authenticated;  -- genres_select_public

-- The list. Sources: BISAC subject headings (Book Industry Study Group, 2024 edition) for
-- FICTION, JUVENILE FICTION, YOUNG ADULT FICTION, POETRY and DRAMA, plus the bookshop sections
-- for essays, memoir and the nonfiction writers here publish (no journalism, Q52). The Romanian
-- names are the ones Romanian bookshops use; Robert reads every new Romanian text (17 Oct 2026,
-- 19:33).
insert into public.genres (position, group_key, slug, name_en, name_ro, minimum_rating) values
  -- Fiction: general and literary.
  (1, 'fiction', 'literary_fiction', 'Literary fiction', 'Ficțiune literară', 'all_ages'),
  (2, 'fiction', 'contemporary_fiction', 'Contemporary fiction', 'Ficțiune contemporană', 'all_ages'),
  (3, 'fiction', 'historical_fiction', 'Historical fiction', 'Ficțiune istorică', 'all_ages'),
  (4, 'fiction', 'family_saga', 'Family saga', 'Saga de familie', 'all_ages'),
  (5, 'fiction', 'coming_of_age', 'Coming of age', 'Roman de formare', 'all_ages'),
  (6, 'fiction', 'womens_fiction', 'Women''s fiction', 'Ficțiune pentru femei', 'all_ages'),
  (7, 'fiction', 'psychological_fiction', 'Psychological fiction', 'Roman psihologic', 'all_ages'),
  (8, 'fiction', 'philosophical_fiction', 'Philosophical fiction', 'Ficțiune filozofică', 'all_ages'),
  (9, 'fiction', 'political_fiction', 'Political fiction', 'Ficțiune politică', 'all_ages'),
  (10, 'fiction', 'biographical_fiction', 'Biographical fiction', 'Ficțiune biografică', 'all_ages'),
  (11, 'fiction', 'religious_fiction', 'Religious and spiritual fiction', 'Ficțiune religioasă și spirituală', 'all_ages'),
  (12, 'fiction', 'lgbtq_fiction', 'LGBTQ+ fiction', 'Ficțiune LGBTQ+', 'all_ages'),
  (13, 'fiction', 'war_fiction', 'War and military fiction', 'Ficțiune de război', 'all_ages'),
  (14, 'fiction', 'westerns', 'Westerns', 'Western', 'all_ages'),
  (15, 'fiction', 'sea_stories', 'Sea stories', 'Povești pe mare', 'all_ages'),
  (16, 'fiction', 'action_adventure', 'Action and adventure', 'Acțiune și aventură', 'all_ages'),
  (17, 'fiction', 'humorous_fiction', 'Humorous fiction', 'Proză umoristică', 'all_ages'),
  (18, 'fiction', 'satire', 'Satire', 'Satiră', 'all_ages'),
  (19, 'fiction', 'absurdist_fiction', 'Absurdist fiction', 'Literatura absurdului', 'all_ages'),
  (20, 'fiction', 'experimental_fiction', 'Experimental fiction', 'Ficțiune experimentală', 'all_ages'),
  (21, 'fiction', 'magical_realism', 'Magical realism', 'Realism magic', 'all_ages'),
  (22, 'fiction', 'short_stories', 'Short stories', 'Proză scurtă', 'all_ages'),
  (23, 'fiction', 'flash_fiction', 'Flash fiction', 'Microproză', 'all_ages'),
  (24, 'fiction', 'novellas', 'Novellas', 'Nuvele', 'all_ages'),
  (25, 'fiction', 'epistolary_fiction', 'Epistolary fiction', 'Roman epistolar', 'all_ages'),
  (26, 'fiction', 'folklore', 'Folklore and legends', 'Folclor și legende', 'all_ages'),
  (27, 'fiction', 'myth_retellings', 'Myth retellings', 'Mituri repovestite', 'all_ages'),
  (28, 'fiction', 'fables', 'Fables', 'Fabule', 'all_ages'),
  (29, 'fiction', 'holiday_stories', 'Holiday stories', 'Povești de sărbători', 'all_ages'),
  -- Fiction: crime, mystery and thrillers.
  (40, 'fiction', 'crime', 'Crime', 'Polițist', 'all_ages'),
  (41, 'fiction', 'mystery', 'Mystery', 'Mister', 'all_ages'),
  (42, 'fiction', 'detective_fiction', 'Detective fiction', 'Roman detectivistic', 'all_ages'),
  (43, 'fiction', 'cosy_mystery', 'Cosy mystery', 'Mister cozy', 'all_ages'),
  (44, 'fiction', 'police_procedural', 'Police procedural', 'Anchetă polițienească', 'all_ages'),
  (45, 'fiction', 'historical_mystery', 'Historical mystery', 'Mister istoric', 'all_ages'),
  (46, 'fiction', 'noir', 'Noir', 'Noir', 'all_ages'),
  (47, 'fiction', 'heist', 'Heist', 'Jafuri și spargeri', 'all_ages'),
  (48, 'fiction', 'thriller', 'Thriller', 'Thriller', 'all_ages'),
  (49, 'fiction', 'psychological_thriller', 'Psychological thriller', 'Thriller psihologic', 'all_ages'),
  (50, 'fiction', 'domestic_thriller', 'Domestic thriller', 'Thriller domestic', 'all_ages'),
  (51, 'fiction', 'legal_thriller', 'Legal thriller', 'Thriller juridic', 'all_ages'),
  (52, 'fiction', 'political_thriller', 'Political thriller', 'Thriller politic', 'all_ages'),
  (53, 'fiction', 'medical_thriller', 'Medical thriller', 'Thriller medical', 'all_ages'),
  (54, 'fiction', 'techno_thriller', 'Techno-thriller', 'Tehno-thriller', 'all_ages'),
  (55, 'fiction', 'espionage', 'Espionage', 'Spionaj', 'all_ages'),
  (56, 'fiction', 'suspense', 'Suspense', 'Suspans', 'all_ages'),
  -- Fiction: horror.
  (60, 'fiction', 'horror', 'Horror', 'Horror', 'all_ages'),
  (61, 'fiction', 'psychological_horror', 'Psychological horror', 'Horror psihologic', 'all_ages'),
  (62, 'fiction', 'gothic', 'Gothic', 'Gotic', 'all_ages'),
  (63, 'fiction', 'ghost_stories', 'Ghost stories', 'Povești cu fantome', 'all_ages'),
  (64, 'fiction', 'cosmic_horror', 'Cosmic horror', 'Horror cosmic', 'all_ages'),
  (65, 'fiction', 'folk_horror', 'Folk horror', 'Horror folcloric', 'all_ages'),
  (66, 'fiction', 'paranormal', 'Paranormal', 'Paranormal', 'all_ages'),
  (67, 'fiction', 'vampires', 'Vampires', 'Vampiri', 'all_ages'),
  (68, 'fiction', 'shapeshifters', 'Werewolves and shapeshifters', 'Vârcolaci și metamorfi', 'all_ages'),
  (69, 'fiction', 'zombies', 'Zombies', 'Zombi', 'all_ages'),
  -- Fiction: fantasy.
  (80, 'fiction', 'fantasy', 'Fantasy', 'Fantasy', 'all_ages'),
  (81, 'fiction', 'epic_fantasy', 'Epic fantasy', 'Fantasy epic', 'all_ages'),
  (82, 'fiction', 'high_fantasy', 'High fantasy', 'High fantasy', 'all_ages'),
  (83, 'fiction', 'urban_fantasy', 'Urban fantasy', 'Fantasy urban', 'all_ages'),
  (84, 'fiction', 'dark_fantasy', 'Dark fantasy', 'Fantasy întunecat', 'all_ages'),
  (85, 'fiction', 'historical_fantasy', 'Historical fantasy', 'Fantasy istoric', 'all_ages'),
  (86, 'fiction', 'romantasy', 'Romantasy', 'Romantasy', 'all_ages'),
  (87, 'fiction', 'sword_and_sorcery', 'Sword and sorcery', 'Spadă și vrăjitorie', 'all_ages'),
  (88, 'fiction', 'cosy_fantasy', 'Cosy fantasy', 'Fantasy cozy', 'all_ages'),
  (89, 'fiction', 'portal_fantasy', 'Portal fantasy', 'Fantasy cu portaluri', 'all_ages'),
  (90, 'fiction', 'fairy_tale_retellings', 'Fairy tale retellings', 'Basme repovestite', 'all_ages'),
  (91, 'fiction', 'superheroes', 'Superheroes', 'Supereroi', 'all_ages'),
  (92, 'fiction', 'litrpg', 'LitRPG and GameLit', 'LitRPG și GameLit', 'all_ages'),
  -- Fiction: science fiction.
  (100, 'fiction', 'science_fiction', 'Science fiction', 'Științifico-fantastic', 'all_ages'),
  (101, 'fiction', 'space_opera', 'Space opera', 'Space opera', 'all_ages'),
  (102, 'fiction', 'hard_science_fiction', 'Hard science fiction', 'SF hard', 'all_ages'),
  (103, 'fiction', 'military_science_fiction', 'Military science fiction', 'SF militar', 'all_ages'),
  (104, 'fiction', 'cyberpunk', 'Cyberpunk', 'Cyberpunk', 'all_ages'),
  (105, 'fiction', 'steampunk', 'Steampunk', 'Steampunk', 'all_ages'),
  (106, 'fiction', 'dystopian', 'Dystopian', 'Distopie', 'all_ages'),
  (107, 'fiction', 'utopian', 'Utopian', 'Utopie', 'all_ages'),
  (108, 'fiction', 'post_apocalyptic', 'Post-apocalyptic', 'Postapocaliptic', 'all_ages'),
  (109, 'fiction', 'time_travel', 'Time travel', 'Călătorii în timp', 'all_ages'),
  (110, 'fiction', 'alien_contact', 'Alien contact', 'Contact extraterestru', 'all_ages'),
  (111, 'fiction', 'alternative_history', 'Alternative history', 'Istorie alternativă', 'all_ages'),
  (112, 'fiction', 'climate_fiction', 'Climate fiction', 'Ficțiune climatică', 'all_ages'),
  -- Fiction: romance.
  (120, 'fiction', 'romance', 'Romance', 'Romance', 'all_ages'),
  (121, 'fiction', 'contemporary_romance', 'Contemporary romance', 'Romance contemporan', 'all_ages'),
  (122, 'fiction', 'historical_romance', 'Historical romance', 'Romance istoric', 'all_ages'),
  (123, 'fiction', 'regency_romance', 'Regency romance', 'Romance Regency', 'all_ages'),
  (124, 'fiction', 'romantic_comedy', 'Romantic comedy', 'Comedie romantică', 'all_ages'),
  (125, 'fiction', 'romantic_suspense', 'Romantic suspense', 'Suspans romantic', 'all_ages'),
  (126, 'fiction', 'paranormal_romance', 'Paranormal romance', 'Romance paranormal', 'all_ages'),
  (127, 'fiction', 'fantasy_romance', 'Fantasy romance', 'Romance fantasy', 'all_ages'),
  (128, 'fiction', 'science_fiction_romance', 'Science fiction romance', 'Romance SF', 'all_ages'),
  (129, 'fiction', 'dark_romance', 'Dark romance', 'Dark romance', 'all_ages'),
  (130, 'fiction', 'lgbtq_romance', 'LGBTQ+ romance', 'Romance LGBTQ+', 'all_ages'),
  (131, 'fiction', 'sports_romance', 'Sports romance', 'Romance sportiv', 'all_ages'),
  (132, 'fiction', 'erotic_romance', 'Erotic romance', 'Romance erotic', '18_plus'),
  (133, 'fiction', 'erotica', 'Erotica', 'Literatură erotică', '18_plus'),
  -- Young adult fiction (BISAC YOUNG ADULT FICTION).
  (200, 'young_adult', 'young_adult', 'Young adult', 'Pentru adolescenți', 'all_ages'),
  (201, 'young_adult', 'ya_contemporary', 'Young adult contemporary', 'Contemporan pentru adolescenți', 'all_ages'),
  (202, 'young_adult', 'ya_fantasy', 'Young adult fantasy', 'Fantasy pentru adolescenți', 'all_ages'),
  (203, 'young_adult', 'ya_romance', 'Young adult romance', 'Romance pentru adolescenți', 'all_ages'),
  (204, 'young_adult', 'ya_science_fiction', 'Young adult science fiction', 'SF pentru adolescenți', 'all_ages'),
  (205, 'young_adult', 'ya_dystopian', 'Young adult dystopian', 'Distopie pentru adolescenți', 'all_ages'),
  (206, 'young_adult', 'ya_mystery_thriller', 'Young adult mystery and thriller', 'Mister și thriller pentru adolescenți', 'all_ages'),
  (207, 'young_adult', 'ya_horror', 'Young adult horror', 'Horror pentru adolescenți', 'all_ages'),
  (208, 'young_adult', 'ya_paranormal', 'Young adult paranormal', 'Paranormal pentru adolescenți', 'all_ages'),
  (209, 'young_adult', 'ya_historical', 'Young adult historical', 'Ficțiune istorică pentru adolescenți', 'all_ages'),
  (210, 'young_adult', 'new_adult', 'New adult', 'New adult', 'all_ages'),
  -- Children's fiction (BISAC JUVENILE FICTION).
  (300, 'children', 'childrens_fiction', 'Children''s fiction', 'Ficțiune pentru copii', 'all_ages'),
  (301, 'children', 'middle_grade', 'Middle grade', 'Pentru copii de 8–12 ani', 'all_ages'),
  (302, 'children', 'picture_books', 'Picture books', 'Cărți ilustrate', 'all_ages'),
  (303, 'children', 'early_readers', 'Early readers', 'Primele lecturi', 'all_ages'),
  (304, 'children', 'fairy_tales', 'Fairy tales', 'Basme', 'all_ages'),
  (305, 'children', 'bedtime_stories', 'Bedtime stories', 'Povești de seară', 'all_ages'),
  (306, 'children', 'animal_stories', 'Animal stories', 'Povești cu animale', 'all_ages'),
  (307, 'children', 'childrens_adventure', 'Children''s adventure', 'Aventuri pentru copii', 'all_ages'),
  (308, 'children', 'childrens_fantasy', 'Children''s fantasy', 'Fantasy pentru copii', 'all_ages'),
  (309, 'children', 'childrens_mystery', 'Children''s mystery', 'Mister pentru copii', 'all_ages'),
  (310, 'children', 'school_stories', 'School stories', 'Povești de la școală', 'all_ages'),
  (311, 'children', 'funny_stories_for_children', 'Funny stories for children', 'Povești amuzante pentru copii', 'all_ages'),
  -- Poetry (BISAC POETRY, by form and subject).
  (400, 'poetry', 'lyric_poetry', 'Lyric poetry', 'Poezie lirică', 'all_ages'),
  (401, 'poetry', 'free_verse', 'Free verse', 'Vers liber', 'all_ages'),
  (402, 'poetry', 'sonnets', 'Sonnets', 'Sonete', 'all_ages'),
  (403, 'poetry', 'haiku', 'Haiku', 'Haiku', 'all_ages'),
  (404, 'poetry', 'narrative_poetry', 'Narrative poetry', 'Poezie narativă', 'all_ages'),
  (405, 'poetry', 'epic_poetry', 'Epic poetry', 'Poezie epică', 'all_ages'),
  (406, 'poetry', 'prose_poetry', 'Prose poetry', 'Poeme în proză', 'all_ages'),
  (407, 'poetry', 'ballads', 'Ballads', 'Balade', 'all_ages'),
  (408, 'poetry', 'odes', 'Odes', 'Ode', 'all_ages'),
  (409, 'poetry', 'elegies', 'Elegies', 'Elegii', 'all_ages'),
  (410, 'poetry', 'epigrams', 'Epigrams', 'Epigrame', 'all_ages'),
  (411, 'poetry', 'spoken_word', 'Spoken word', 'Spoken word', 'all_ages'),
  (412, 'poetry', 'love_poetry', 'Love poetry', 'Poezie de dragoste', 'all_ages'),
  (413, 'poetry', 'nature_poetry', 'Nature poetry', 'Poezie despre natură', 'all_ages'),
  (414, 'poetry', 'spiritual_poetry', 'Spiritual poetry', 'Poezie spirituală', 'all_ages'),
  (415, 'poetry', 'political_poetry', 'Political poetry', 'Poezie politică', 'all_ages'),
  (416, 'poetry', 'humorous_poetry', 'Humorous poetry', 'Poezie umoristică', 'all_ages'),
  (417, 'poetry', 'experimental_poetry', 'Experimental poetry', 'Poezie experimentală', 'all_ages'),
  (418, 'poetry', 'poetry_for_children', 'Poetry for children', 'Poezie pentru copii', 'all_ages'),
  (419, 'poetry', 'erotic_poetry', 'Erotic poetry', 'Poezie erotică', '18_plus'),
  -- Drama (BISAC DRAMA).
  (500, 'drama', 'plays', 'Plays', 'Teatru', 'all_ages'),
  (501, 'drama', 'screenplays', 'Screenplays', 'Scenarii de film', 'all_ages'),
  (502, 'drama', 'monologues', 'Monologues', 'Monologuri', 'all_ages'),
  -- Nonfiction: essays, life writing and the shelves next to them.
  (600, 'nonfiction', 'personal_essays', 'Personal essays', 'Eseuri personale', 'all_ages'),
  (601, 'nonfiction', 'literary_essays', 'Literary essays', 'Eseuri literare', 'all_ages'),
  (602, 'nonfiction', 'humorous_essays', 'Humorous essays', 'Eseuri umoristice', 'all_ages'),
  (603, 'nonfiction', 'memoir', 'Memoir', 'Memorii', 'all_ages'),
  (604, 'nonfiction', 'autobiography', 'Autobiography', 'Autobiografie', 'all_ages'),
  (605, 'nonfiction', 'biography', 'Biography', 'Biografie', 'all_ages'),
  (606, 'nonfiction', 'letters_and_diaries', 'Letters and diaries', 'Scrisori și jurnale', 'all_ages'),
  (607, 'nonfiction', 'travel_writing', 'Travel writing', 'Literatură de călătorie', 'all_ages'),
  (608, 'nonfiction', 'nature_writing', 'Nature and environment', 'Natură și mediu', 'all_ages'),
  (609, 'nonfiction', 'food_writing', 'Food and drink', 'Gastronomie', 'all_ages'),
  (610, 'nonfiction', 'history', 'History', 'Istorie', 'all_ages'),
  (611, 'nonfiction', 'military_history', 'Military history', 'Istorie militară', 'all_ages'),
  (612, 'nonfiction', 'true_crime', 'True crime', 'Crime reale', 'all_ages'),
  (613, 'nonfiction', 'philosophy', 'Philosophy', 'Filozofie', 'all_ages'),
  (614, 'nonfiction', 'religion_and_spirituality', 'Religion and spirituality', 'Religie și spiritualitate', 'all_ages'),
  (615, 'nonfiction', 'psychology', 'Psychology', 'Psihologie', 'all_ages'),
  (616, 'nonfiction', 'self_help', 'Self-help', 'Dezvoltare personală', 'all_ages'),
  (617, 'nonfiction', 'health_and_wellbeing', 'Health and wellbeing', 'Sănătate și stare de bine', 'all_ages'),
  (618, 'nonfiction', 'parenting_and_family', 'Parenting and family', 'Părinți și copii', 'all_ages'),
  (619, 'nonfiction', 'popular_science', 'Popular science', 'Popularizarea științei', 'all_ages'),
  (620, 'nonfiction', 'politics_and_society', 'Politics and society', 'Politică și societate', 'all_ages'),
  (621, 'nonfiction', 'cultural_criticism', 'Cultural criticism', 'Critică culturală', 'all_ages'),
  (622, 'nonfiction', 'literary_criticism', 'Literary criticism', 'Critică literară', 'all_ages'),
  (623, 'nonfiction', 'arts_and_music', 'Art and music', 'Artă și muzică', 'all_ages'),
  (624, 'nonfiction', 'film_and_television', 'Film and television', 'Film și televiziune', 'all_ages'),
  (625, 'nonfiction', 'sport', 'Sport', 'Sport', 'all_ages'),
  (626, 'nonfiction', 'business_and_economics', 'Business and economics', 'Afaceri și economie', 'all_ages'),
  (627, 'nonfiction', 'writing_and_craft', 'Writing and craft', 'Despre scris', 'all_ages');

/* ---------- 2. A story's genres ---------- */

-- Up to three genre slugs per story. The board's "Set in" (CALM-9) uses the same shape: a short
-- list of keys on the story itself, written only through the writer's own function.
alter table public.stories
  add column genre_slugs text[] not null default '{}',
  add constraint stories_genre_slugs_are_keys check (
    cardinality(genre_slugs) <= 3
    and array_to_string(genre_slugs, ',') ~ '^([a-z_]{2,40}(,[a-z_]{2,40})*)?$');

comment on column public.stories.genre_slugs is
  'The story''s genres (genres.slug), at most three; an 18+ genre only on an 18+ story (S1-E3-01, Robert 26 Nov 2026).';

-- Discover's genre filter asks "has this genre" of every listed story.
create index stories_genre_slugs on public.stories using gin (genre_slugs);

/**
 * keep_story_genres_within_rating: takes off a story's genres its rating is too young for, so
 * an 18+ genre only ever sits on an 18+ story.
 *
 * Inputs: the new story row (trigger). Returns: the row, with genre_slugs trimmed when needed.
 * Errors: none. Where it fits: on every insert and every change of genre_slugs or rating, the
 * writer's (update_my_story(), set_my_story_genres()) and staff's (admin_update_story()) alike.
 * Why a trigger and not a refusal: lowering a rating is a normal settings change, and the 18+
 * genre no longer fits the story the writer describes; nothing else of the story changes.
 */
create or replace function public.keep_story_genres_within_rating()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Step 1: nothing to check for a story with no genres (the common case).
  if cardinality(new.genre_slugs) = 0 then
    return new;
  end if;
  -- Step 2: keep each genre whose youngest rating the story's rating reaches, in the same order.
  -- story_rating is ordered all_ages < 13_plus < 16_plus < 18_plus.
  new.genre_slugs := array(
    select chosen.slug
    from unnest(new.genre_slugs) with ordinality as chosen (slug, place)
    where not exists (
      select 1 from public.genres
      where genres.slug = chosen.slug and genres.minimum_rating > new.rating)
    order by chosen.place);
  return new;
end;
$$;

comment on function public.keep_story_genres_within_rating() is
  'Trigger: an 18+ genre comes off a story that isn''t rated 18+ (S1-E3-01, rule 18).';
revoke all on function public.keep_story_genres_within_rating() from public, anon, authenticated;

create trigger stories_keep_genres_within_rating
  before insert or update of genre_slugs, rating on public.stories
  for each row execute function public.keep_story_genres_within_rating();

/* ---------- 3. The writer saves them ---------- */

/**
 * clean_genre_slugs: the genre list as it is saved: no empty entries, no repeats, in the order
 * picked, each a genre the caller may read.
 *
 * Inputs: the slugs as the form sent them. Returns: the cleaned list.
 * Errors: check_violation (hint 'unknown_genre') for a slug that isn't a genre, or an 18+ genre
 *   for someone too young to read one (rating_allows(), age_band(); rule 18), and (hint
 *   'too_many_genres') for more than three.
 * Internal: set_my_story_genres().
 */
create or replace function public.clean_genre_slugs(wanted text[])
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cleaned text[];
begin
  -- Step 1: tidy the list, keeping the writer's order.
  cleaned := array(
    select picked.slug from (
      select lower(btrim(entry)) as slug, min(place) as first_place
      from unnest(coalesce(wanted, '{}')) with ordinality as entries (entry, place)
      where btrim(coalesce(entry, '')) <> ''
      group by lower(btrim(entry))) as picked
    order by picked.first_place);
  -- Step 2: at most three (the form's limit too).
  if cardinality(cleaned) > 3 then
    raise exception 'Choose at most 3 genres.' using errcode = 'check_violation', hint = 'too_many_genres';
  end if;
  -- Step 3: each one a genre this person may read; an under-18 can't name an 18+ genre.
  if exists (
    select 1 from unnest(cleaned) as picked (slug)
    where not exists (
      select 1 from public.genres
      where genres.slug = picked.slug
        and (genres.minimum_rating = 'all_ages' or public.rating_allows(genres.minimum_rating)))) then
    raise exception 'That genre isn''t on the list.' using errcode = 'check_violation', hint = 'unknown_genre';
  end if;
  return cleaned;
end;
$$;

comment on function public.clean_genre_slugs(text[]) is
  'Internal: a story''s genre list tidied and checked against the genres the caller may read (S1-E3-01).';
revoke all on function public.clean_genre_slugs(text[]) from public, anon, authenticated;

/**
 * set_my_story_genres: the writer says which genres their story belongs to.
 *
 * Inputs: the story's address and the genre slugs (an empty list clears them).
 * Returns: {"outcome": "ok" | "not_active" | "not_found"}.
 * Errors: insufficient_privilege when signed out; check_violation for an unknown genre (hint
 *   'unknown_genre'), more than three (hint 'too_many_genres') or an 18+ genre on a story that
 *   isn't rated 18+ (hint 'genre_needs_adult_rating').
 * Where it fits: createStory() (after create_story(), through saveNewStoryExtras()) and
 *   updateMyStory() in src/features/writing/api/stories.ts, after the rating is saved.
 */
create or replace function public.set_my_story_genres(story_slug text, wanted_genres text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  family_story_id uuid;
  story_rating public.story_rating;
  cleaned text[];
begin
  -- Step 1: a signed-in writer who may write.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  cleaned := public.clean_genre_slugs(wanted_genres);
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  -- Step 2: their own live story.
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select coalesce(stories.edition_of_story_id, stories.id), stories.rating
    into family_story_id, story_rating
  from public.stories where stories.id = target_story_id;
  -- Step 3: an 18+ genre needs an 18+ story (rule 18), said out loud instead of dropped.
  if exists (
    select 1 from public.genres
    where genres.slug = any (cleaned) and genres.minimum_rating > story_rating) then
    raise exception 'This genre needs the 18+ rating.'
      using errcode = 'check_violation', hint = 'genre_needs_adult_rating';
  end if;
  -- Step 4: save it on the original and every edition, so each language says the same.
  update public.stories set genre_slugs = cleaned
  where stories.id = family_story_id or stories.edition_of_story_id = family_story_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_my_story_genres(text, text[]) is
  'The writer sets their story''s genres, at most three; 18+ genres only on 18+ stories (S1-E3-01).';
revoke all on function public.set_my_story_genres(text, text[]) from public;
grant execute on function public.set_my_story_genres(text, text[]) to authenticated;

/* ---------- 4. Discover's genre filter ---------- */

/**
 * story_list_genres: the genres Discover's filter offers: only those at least one story this
 * reader may see carries, so the list never offers an empty shelf.
 *
 * Inputs: none (the reader is the caller, or a visitor).
 * Returns: one row per genre in use: slug, the two names, its group and how many visible
 *   stories carry it, in the list's order.
 * Errors: none. Where it fits: StoryListFilters' Genre drop-down (src/features/discovery/).
 * Rules: listed_stories() applies every reader rule (ratings by age_band(), blocks, drafts,
 *   moderation, hidden countries), and an 18+ genre is left out for anyone too young to read it.
 */
create or replace function public.story_list_genres()
returns table (slug text, name_en text, name_ro text, group_key text, story_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (
    select listed.genre_slugs
    from public.listed_stories('updated', null, null, null, null) as listed
    where cardinality(listed.genre_slugs) > 0
  ),
  used as (
    select used_slug, count(*) as story_count
    from visible cross join unnest(visible.genre_slugs) as used_slug
    group by used_slug
  )
  select genres.slug, genres.name_en, genres.name_ro, genres.group_key, used.story_count
  from used
  join public.genres on genres.slug = used.used_slug
  where genres.minimum_rating = 'all_ages' or public.rating_allows(genres.minimum_rating)
  order by genres.position;
$$;

comment on function public.story_list_genres() is
  'The genres used by stories this reader may see, for Discover''s genre filter (S1-E3-01).';
revoke all on function public.story_list_genres() from public;
grant execute on function public.story_list_genres() to anon, authenticated;

/* ---------- 5. browse_stories() with the genre filter ---------- */

-- A new input changes the function's signature, so the 11-input version goes first (the same
-- step as 20270205100610); every caller passes inputs by name, so none of them changes.
drop function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text, public.story_rating, text);

/**
 * browse_stories: one page of a story list with its total, in the reader's sort.
 * Input: list_kind, list_key, category_slug, completion, language, sort_order, page_size,
 *   page_offset, popular_in, story_rating and story_length, as in 20270205100612, and now
 *   genre_slug: one genre (genres.slug), or null for any. A genre the reader may not read finds
 *   nothing, because the stories carrying it are 18+ and listed_stories() hides them.
 * Returns: { total, stories: [story cards, a search's with their reads], popular_in }.
 * Errors: invalid_parameter_value for an unknown list, sort, country or length, a missing key or
 *   a negative offset.
 * Where it fits: every story list of the app (Discover rows, See all pages, category, tag and
 *   writer pages, search results).
 */
create or replace function public.browse_stories(
  list_kind text,
  list_key text default null,
  category_slug text default null,
  completion public.completion_status default null,
  language text default null,
  sort_order text default null,
  page_size integer default 21,
  page_offset integer default 0,
  popular_in text default null,
  story_rating public.story_rating default null,
  story_length text default null,
  genre_slug text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  ordering text := coalesce(sort_order, public.list_default_sort(list_kind));
  total integer;
  page jsonb;
  -- For "relevance": the term as a word query and as a pattern, worked out once.
  search_terms tsquery := case when list_kind = 'search' then public.search_query(list_key) end;
  search_pattern text := case when list_kind = 'search' then public.search_like_pattern(list_key) end;
  -- MARKETS-2d: the country whose ranking orders a popular list, or null for the overall one.
  ranked_country text;
begin
  -- Step 1: check what was asked for.
  if list_kind is null or not public.is_story_list_kind(list_kind) then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer', 'search') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('popular', 'updated', 'newest', 'oldest', 'title_az', 'title_za', 'writer', 'relevance', 'shared')
      or (ordering = 'relevance' and list_kind <> 'search')
      or (ordering = 'shared' and list_kind <> 'shared') then
    raise exception 'Unknown sort.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first story.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 1a (user story 1.8, board A08): the Length filter knows two answers.
  if story_length is not null and story_length not in ('short', 'long') then
    raise exception 'Unknown length.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 1b (MARKETS-2d): "Popular in" a country. Only a country on the drop-down's list counts;
  -- one with too few ranked stories falls back to the overall ranking (popular_in is then null
  -- in the answer, so the page can say so).
  if popular_in is not null then
    if not public.is_popular_in_country(popular_in) then
      raise exception 'Unknown country.' using errcode = 'invalid_parameter_value';
    end if;
    if ordering = 'popular' and public.country_has_ranking(popular_in) then
      ranked_country := popular_in;
    end if;
  end if;
  -- Step 2: the list once, numbered in the chosen order and counted in the same pass (QA-2a; it
  -- used to be read twice). Only one of the sort lines is switched on (the others are null for
  -- every row); the last two break ties: the newer story, then the address, so pages never
  -- overlap. A story the job hasn't scored yet counts as 0.
  -- User story 1.8 (board A08): the Rating and Length filters narrow the list before it is
  -- numbered, so the total, the pages and the order all agree.
  with listed as (
    select listed_rows.* from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed_rows
    where public.story_matches_list_filters(listed_rows.id, listed_rows.rating, story_rating, story_length)
      -- S1-E3-01 (Robert, 26 Nov 2026): one genre, through the GIN index on genre_slugs.
      and (genre_slug is null or listed_rows.genre_slugs @> array[genre_slug])
  ),
  numbered as (
    select listed.id, count(*) over () as list_total, row_number() over (order by
        -- Relevance, as story_search_rank(): 2 for the term inside the title, plus the word rank,
        -- read from the kept search row instead of building it again for every story.
        case when ordering = 'relevance' then
          (case when public.search_fold(listed.title) like search_pattern then 2 else 0 end)
          + ts_rank(coalesce(documents.document, ''::tsvector), search_terms) end desc,
        -- IDEAS-1e: "Most shared this week", by the last 7 days' chapter shares.
        case when ordering = 'shared' then public.story_shares_this_week(listed.id) end desc,
        -- MARKETS-2d: the country's own ranking first; a story with fewer than 5 readers there
        -- isn't ranked in it and follows, in the overall order.
        case when ranked_country is not null then coalesce(country_scores.score, -1) end desc,
        case when ordering in ('popular', 'relevance') then coalesce(scores.score, 0) end desc,
        case when ordering = 'updated' then listed.last_chapter_published_at end desc nulls last,
        case when ordering = 'newest' then listed.first_published_at end desc nulls last,
        case when ordering = 'oldest' then listed.first_published_at end asc nulls last,
        case when ordering = 'title_az' then listed.title collate "ro-x-icu" end asc,
        case when ordering = 'title_za' then listed.title collate "ro-x-icu" end desc,
        case when ordering = 'writer'
          then public.display_name(profiles.handle, profiles.pen_name) collate "ro-x-icu" end asc,
        listed.first_published_at desc nulls last,
        listed.slug) as position
    from listed
    join public.profiles on profiles.id = listed.user_id
    left join public.story_scores as scores on scores.story_id = listed.id
    left join public.story_country_scores as country_scores
      on ranked_country is not null and country_scores.story_id = listed.id
      and country_scores.country_code = ranked_country
    left join public.story_search_documents as documents
      on ordering = 'relevance' and documents.story_id = listed.id
  ),
  -- Step 3: the page's cards. The total comes from any row; an empty list or a page past the end
  -- counts again below.
  page_rows as (
    select numbered.id, numbered.position, numbered.list_total from numbered
    order by numbered.position
    limit wanted_rows offset coalesce(page_offset, 0)
  )
  -- User story 1.8 (board A08): a search row also says how many reads the story has, the same
  -- public total its story page shows (story_read_total(), BOOKS-B2); other lists don't need it,
  -- so they don't pay for it.
  select coalesce(jsonb_agg(public.story_card_json(page_rows.id)
                            || public.story_list_row_extras(list_kind, page_rows.id)
                            order by page_rows.position), '[]'::jsonb),
         max(page_rows.list_total)
    into page, total
  from page_rows;
  -- Step 4: a page past the end has no rows to carry the total, so count it (rare).
  if total is null then
    select count(*) into total
    from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed_rows
    where public.story_matches_list_filters(listed_rows.id, listed_rows.rating, story_rating, story_length)
      and (genre_slug is null or listed_rows.genre_slugs @> array[genre_slug]);
  end if;
  return jsonb_build_object('total', total, 'stories', page, 'popular_in', ranked_country);
end;
$$;

comment on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text, public.story_rating, text, text) is
  'One page of a story list (Discover shelves, category, tag and See all pages, search) with its total, in the reader''s sort; popular by default, optionally by one country''s ranking, one rating, one length and one genre (S1-E5-01, S1-E5-02, S1-E5-03, MARKETS-2d, user story 1.8, S1-E3-01).';
revoke all on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text, public.story_rating, text, text) from public;
grant execute on function public.browse_stories(text, text, text, public.completion_status, text, text, integer, integer, text, public.story_rating, text, text) to anon, authenticated;
