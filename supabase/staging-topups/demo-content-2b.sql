-- Staging top-up: demo content, part 2b (TOOL-3, 25 Oct 2026). Hand-written, not generated.
--
-- What it is for: part 2a (demo-content-2a.sql or its parts) put 36 synthetic stories, 20
-- classics and five synthetic writers on staging. This part makes them look read: follows,
-- chapter likes, comments with a few writer replies, emoji reactions on the comments and daily
-- read totals, so Discover, the story pages, the writer profiles and the bell look alive for the
-- January 2027 demo (lanes/01-replan-24-oct.md, TOOL-3).
--
-- How to run it: AFTER part 2a. In the Supabase SQL Editor paste the whole file and run it (it is
-- one transaction and well under the Editor's size limit), or locally:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/staging-topups/demo-content-2b.sql
-- How to check it worked: the last query prints the counts (see the staging-topups README).
--
-- Rules it keeps (supabase/staging-topups/README.md):
-- - Never production: it refuses a database without the 16 seed personas, and one without part 2a.
-- - It creates no accounts. Only the active adult test accounts act: adult_writer, teacher,
--   blocker and the five demo writers. No minor, no staff persona and no sanctioned persona
--   likes, comments or follows anything (the March test is invited adults only, decided
--   17 Oct 2026, 12:44).
-- - Nobody likes their own chapter or follows themselves, and nobody acts across a block, either
--   way (S1-E5-05).
-- - Comments only where the writer left comments on (S1-E6-01), and only on the 36 demo stories:
--   the classics get likes and reads but no comments, because a comment like "can't wait for the
--   next chapter" reads oddly under a classic.
-- - Read totals are totals per chapter per day, never who read (architecture 1.6 and 1.7.9).
-- - Safe to run twice: every comment has a fixed id worked out from its chapter and its writer,
--   and likes, reactions, follows and read totals have one row per pair or per day, so a second
--   run inserts nothing (and so fires no second notification).
-- - All the text is synthetic: invented lines, no real person, no real work. Romanian uses ș and ț.
--
-- Side effect, on purpose: the notification triggers fire for the new reactions and follows
-- (S1-E7-01), so the demo writers' bells show "new followers" and "reactions" rows. Comments
-- don't queue the comment notification job, so the bells aren't flooded with one row per comment.
begin;

-- 1. Never production, and never before part 2a.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This top-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
  if (select count(*) from public.stories where slug like '%-demo-__') < 36 then
    raise exception 'Run part 2a first (demo-content-2a.sql or its parts): the 36 demo stories are missing.';
  end if;
end;
$$;

-- 2. A repeatable "random" number from a piece of text: the first 28 bits of its md5, so the
--    same story, chapter and person always give the same answer and a second run makes the
--    same choices as the first. Lives only for this session (pg_temp).
create function pg_temp.demo_number(seed text) returns integer
language sql immutable as $$
  select ('x' || substr(md5(seed), 1, 7))::bit(28)::integer;
$$;

-- True when either person blocks the other (S1-E5-05: blocks work both ways).
create function pg_temp.demo_blocked(first_user_id uuid, second_user_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.blocks
    where (blocks.user_id = first_user_id and blocks.blocked_user_id = second_user_id)
       or (blocks.user_id = second_user_id and blocks.blocked_user_id = first_user_id)
  );
$$;

-- 3. Who acts: the active adult test accounts only.
create temporary table demo_actors on commit drop as
select profiles.id as user_id, profiles.handle
from public.profiles
where profiles.id in (
  '00000000-0000-4000-8000-000000000001', -- adult_writer
  '00000000-0000-4000-8000-000000000007', -- teacher
  '00000000-0000-4000-8000-000000000015', -- blocker
  '00000000-0000-4000-8000-000000000101', -- ana_cu_harti
  '00000000-0000-4000-8000-000000000102', -- tudor_farasomn
  '00000000-0000-4000-8000-000000000103', -- ilinca_noaptea
  '00000000-0000-4000-8000-000000000104', -- radu_din_deal
  '00000000-0000-4000-8000-000000000105'  -- sofia_cerneala
);

-- 4. Every published demo and classic chapter, with what the choices below need. Each story
--    gets a fixed "popularity" from 20 to 85 (out of 100) from its slug, so some stories are
--    liked and read much more than others and the shelves don't all look the same.
create temporary table demo_chapters on commit drop as
select
  chapters.id as chapter_id,
  chapters.position,
  greatest(chapters.first_published_at, now() - interval '60 days') as published_at,
  stories.id as story_id,
  stories.slug,
  stories.user_id as writer_id,
  stories.comments_enabled,
  stories.slug like '%-demo-__' as is_demo_story,
  20 + pg_temp.demo_number('popularity:' || stories.slug) % 66 as popularity,
  -- Which pool of comment lines fits the story: its language, then its category.
  case
    when stories.language_code = 'en' then 'en'
    when categories.slug = 'poetry' then 'ro_poetry'
    when categories.slug = 'nonfiction_essays' then 'ro_nonfiction'
    else 'ro_fiction'
  end as line_pool,
  categories.slug = 'fiction' as is_fiction
from public.chapters
join public.stories on stories.id = chapters.story_id
join public.categories on categories.id = stories.category_id
where (stories.slug like '%-demo-__' or stories.slug like '%-classic')
  and stories.deleted_at is null
  and chapters.deleted_at is null
  and chapters.status = 'published'
  and chapters.first_published_at is not null;

-- 5. The comment lines: synthetic, short and general enough to fit any story in their pool.
create temporary table demo_lines on commit drop as
select pool, row_number() over (partition by pool order by ordinal) as line_number, body
from (values
  ('ro_fiction', 1, 'Am citit capitolul în autobuz și era să-mi scap stația.'),
  ('ro_fiction', 2, 'Îmi place cum descrii locurile. Parcă am fost și eu acolo.'),
  ('ro_fiction', 3, 'Finalul capitolului m-a prins complet nepregătită.'),
  ('ro_fiction', 4, 'Dialogul sună foarte natural. Exact așa vorbesc oamenii.'),
  ('ro_fiction', 5, 'Abia aștept capitolul următor!'),
  ('ro_fiction', 6, 'Personajul principal îmi amintește de cineva din familie.'),
  ('ro_fiction', 7, 'Am râs cu voce tare la scena din bucătărie.'),
  ('ro_fiction', 8, 'Mi-a plăcut ritmul: nici prea repede, nici prea încet.'),
  ('ro_fiction', 9, 'Ce atmosferă! Am citit tot cu sufletul la gură.'),
  ('ro_fiction', 10, 'Detaliul cu lumina de la fereastră e superb.'),
  ('ro_fiction', 11, 'Recunosc, am recitit ultimul paragraf de trei ori.'),
  ('ro_fiction', 12, 'Povestea asta merită mult mai mulți cititori.'),
  ('ro_fiction', 13, 'Mă întreb ce ascunde vecinul. Am o bănuială...'),
  ('ro_fiction', 14, 'Scrii foarte frumos despre lucrurile mărunte.'),
  ('ro_fiction', 15, 'Am trimis capitolul unei prietene. Mi-a cerut continuarea.'),
  ('ro_fiction', 16, 'Scena de la final m-a emoționat mai mult decât mă așteptam.'),
  ('ro_fiction', 17, 'Ador personajele secundare, mai ales pe cel mai tăcut.'),
  ('ro_fiction', 18, 'Aproape că am simțit mirosul de ploaie din descriere.'),
  ('ro_fiction', 19, 'Bine construit! Fiecare frază duce povestea mai departe.'),
  ('ro_fiction', 20, 'Nu mă așteptam la întorsătura asta. Bravo!'),
  ('ro_fiction', 21, 'Citesc seara, înainte de culcare, și aștept fiecare capitol.'),
  ('ro_fiction', 22, 'Mi-ar plăcea să aflu mai multe despre trecutul lor.'),
  ('ro_fiction', 23, 'Titlul capitolului are acum cu totul alt sens.'),
  ('ro_fiction', 24, 'Scurt și foarte bun. Mai vreau!'),
  ('ro_poetry', 1, 'Versul al doilea mi-a rămas în minte toată ziua.'),
  ('ro_poetry', 2, 'Imaginile sunt atât de clare, parcă le văd.'),
  ('ro_poetry', 3, 'L-am citit cu voce tare. Sună și mai bine așa.'),
  ('ro_poetry', 4, 'Simplu și adevărat. Exact ce îmi trebuia azi.'),
  ('ro_poetry', 5, 'Mi-a plăcut cum se încheie, ca o ușă lăsată întredeschisă.'),
  ('ro_poetry', 6, 'Ritmul ăsta liniștit e foarte frumos.'),
  ('ro_poetry', 7, 'Am copiat ultimul vers în caiet.'),
  ('ro_poetry', 8, 'Poezia asta are ceva de cântec.'),
  ('ro_poetry', 9, 'Mă regăsesc în fiecare strofă.'),
  ('ro_poetry', 10, 'Puține cuvinte, multă emoție.'),
  ('ro_poetry', 11, 'Frumos cum transformi un lucru obișnuit în ceva special.'),
  ('ro_poetry', 12, 'O citesc a treia oară și găsesc mereu ceva nou.'),
  ('ro_nonfiction', 1, 'Textul ăsta m-a făcut să mă gândesc la casa bunicilor.'),
  ('ro_nonfiction', 2, 'Am recunoscut fiecare zgomot pe care îl descrii.'),
  ('ro_nonfiction', 3, 'Foarte bine observat. Nu m-am gândit niciodată așa.'),
  ('ro_nonfiction', 4, 'Scrii cu multă căldură despre lucruri pe care le trecem cu vederea.'),
  ('ro_nonfiction', 5, 'Am citit și am rămas câteva minute cu privirea pe fereastră.'),
  ('ro_nonfiction', 6, 'Mi-a plăcut tonul: sincer, fără să se plângă.'),
  ('ro_nonfiction', 7, 'Mi-ai amintit de o vară de demult.'),
  ('ro_nonfiction', 8, 'Un text care te face să încetinești. Mulțumesc.'),
  ('ro_nonfiction', 9, 'Paragraful despre dimineți e preferatul meu.'),
  ('ro_nonfiction', 10, 'Aș citi o carte întreagă scrisă așa.'),
  ('en', 1, 'I read this on the bus and nearly missed my stop.'),
  ('en', 2, 'The atmosphere here is wonderful. I could see every detail.'),
  ('en', 3, 'That ending caught me completely off guard.'),
  ('en', 4, 'The dialogue feels so natural.'),
  ('en', 5, 'Can''t wait for the next chapter!'),
  ('en', 6, 'Beautifully written, especially the quiet moments.'),
  ('en', 7, 'I had to reread the last paragraph twice.'),
  ('en', 8, 'This deserves so many more readers.'),
  ('en', 9, 'The pacing is just right.'),
  ('en', 10, 'I love how much is said in so few words.'),
  ('en', 11, 'That line near the end will stay with me.'),
  ('en', 12, 'Sent this to a friend, and now she wants more too.'),
  -- Spoilers: shown behind "Show spoiler" (S1-E6-01), so they hint at a twist.
  ('ro_spoiler', 1, 'Nu-mi vine să cred cine era de fapt la ușă!'),
  ('ro_spoiler', 2, 'Știam eu că scrisoarea nu se pierduse!'),
  ('ro_spoiler', 3, 'Deci de asta nu voia să spună nimic. Ce final!'),
  ('ro_spoiler', 4, 'Am bănuit de la primul capitol că el era. Și am avut dreptate!'),
  ('en_spoiler', 1, 'I did not see who was behind the door coming at all!'),
  ('en_spoiler', 2, 'So the letter was never lost. Brilliant!'),
  -- The writer's replies to a reader.
  ('ro_reply', 1, 'Mulțumesc mult! Mă bucur că ți-a plăcut.'),
  ('ro_reply', 2, 'Ce bine că ai observat detaliul ăsta. L-am pus acolo special.'),
  ('ro_reply', 3, 'Mulțumesc! Următorul capitol vine curând.'),
  ('ro_reply', 4, 'M-ai făcut să zâmbesc toată dimineața. Mulțumesc!'),
  ('ro_reply', 5, 'Bănuiala ta s-ar putea să fie bună... nu spun mai mult.'),
  ('ro_reply', 6, 'Mulțumesc că ai citit până la capăt!'),
  ('ro_reply', 7, 'Mă bucur că ai simțit asta. Am scris scena de mai multe ori.'),
  ('ro_reply', 8, 'Mulțumesc frumos! Comentariile ca ăsta mă țin să scriu.'),
  ('en_reply', 1, 'Thank you so much! I''m really glad you enjoyed it.'),
  ('en_reply', 2, 'So glad you noticed that detail.'),
  ('en_reply', 3, 'Thank you! The next chapter is on its way.'),
  ('en_reply', 4, 'That made my day. Thank you for reading!'),
  ('en_reply', 5, 'I rewrote that scene several times, so this means a lot.')
) as lines (pool, ordinal, body);

-- How many lines each pool has, to pick one by number.
create temporary table demo_pool_sizes on commit drop as
select pool, count(*)::integer as size from demo_lines group by pool;

-- 6. Follows. Each actor follows about half the writers (and the classics account more often),
--    and some stories, more often the popular ones.
insert into public.follows_users (user_id, followed_user_id, created_at, updated_at)
select actors.user_id, writers.writer_id,
       now() - make_interval(hours => 2 + pg_temp.demo_number('followed-at:' || actors.user_id || writers.writer_id) % 1200),
       now()
from demo_actors as actors
cross join (select distinct writer_id from demo_chapters) as writers
where actors.user_id <> writers.writer_id
  and not pg_temp.demo_blocked(actors.user_id, writers.writer_id)
  and pg_temp.demo_number('follow:' || actors.user_id || writers.writer_id) % 100
      < case when writers.writer_id = '00000000-0000-4000-8000-000000000100' then 70 else 55 end
on conflict (user_id, followed_user_id) do nothing;

insert into public.follows_stories (user_id, story_id, created_at, updated_at)
select actors.user_id, stories.story_id,
       now() - make_interval(hours => 2 + pg_temp.demo_number('story-followed-at:' || actors.user_id || stories.story_id) % 900),
       now()
from demo_actors as actors
cross join (select distinct story_id, writer_id, popularity from demo_chapters) as stories
where actors.user_id <> stories.writer_id
  and not pg_temp.demo_blocked(actors.user_id, stories.writer_id)
  and pg_temp.demo_number('follow-story:' || actors.user_id || stories.story_id) % 100 < stories.popularity / 3
on conflict (user_id, story_id) do nothing;

-- 7. Chapter likes: an actor likes a chapter when its number falls under the story's popularity.
--    Each like is dated a few hours to four days after the chapter came out, never in the future.
insert into public.chapter_likes (user_id, chapter_id, created_at, updated_at)
select actors.user_id, chapters.chapter_id, liked_at, liked_at
from demo_chapters as chapters
cross join demo_actors as actors
cross join lateral (
  select least(now() - interval '10 minutes',
               chapters.published_at + make_interval(hours => 1 + pg_temp.demo_number('liked-at:' || actors.user_id || chapters.chapter_id) % 96))
         as liked_at
) as timing
where actors.user_id <> chapters.writer_id
  and not pg_temp.demo_blocked(actors.user_id, chapters.writer_id)
  and pg_temp.demo_number('like:' || actors.user_id || chapters.chapter_id) % 100 < chapters.popularity
on conflict (user_id, chapter_id) do nothing;

-- 8. Comments. Step one works out every comment this top-up wants (the same ones on every run);
--    step two inserts those that aren't there yet.
--    On each demo chapter with comments on, the actors are put in a fixed order; the first three
--    whose number falls under half the story's popularity comment. One fiction comment in ten
--    is a spoiler. Each comment on a chapter gets a different line from its pool.
create temporary table demo_comments on commit drop as
with candidates as (
  select chapters.*, actors.user_id as commenter_id,
         pg_temp.demo_number('comment:' || actors.user_id || chapters.chapter_id) as choice
  from demo_chapters as chapters
  cross join demo_actors as actors
  where chapters.is_demo_story
    and chapters.comments_enabled
    and actors.user_id <> chapters.writer_id
    and not pg_temp.demo_blocked(actors.user_id, chapters.writer_id)
),
chosen as (
  select candidates.*,
         row_number() over (partition by chapter_id order by choice) as place_on_chapter,
         is_fiction and pg_temp.demo_number('spoiler:' || commenter_id || chapter_id) % 10 = 0 as is_spoiler
  from candidates
  where choice % 100 < popularity / 2
)
select
  md5('demo-2b:comment:' || chosen.chapter_id || ':' || chosen.commenter_id)::uuid as comment_id,
  chosen.chapter_id,
  chosen.writer_id,
  chosen.commenter_id,
  chosen.line_pool,
  chosen.is_spoiler,
  chosen.place_on_chapter,
  lines.body,
  least(now() - interval '30 minutes',
        chosen.published_at + make_interval(hours => 2 + chosen.choice % 120)) as commented_at
from chosen
join demo_pool_sizes as sizes
  on sizes.pool = case when chosen.is_spoiler then
                    case when chosen.line_pool = 'en' then 'en_spoiler' else 'ro_spoiler' end
                  else chosen.line_pool end
join demo_lines as lines
  on lines.pool = sizes.pool
 and lines.line_number = 1 + (pg_temp.demo_number('lines:' || chosen.chapter_id) + chosen.place_on_chapter) % sizes.size
where chosen.place_on_chapter <= 3;

insert into public.comments (id, user_id, chapter_id, body, is_spoiler, created_at, updated_at)
select comment_id, commenter_id, chapter_id, body, is_spoiler, commented_at, commented_at
from demo_comments
on conflict (id) do nothing;

-- 9. The writer answers a little under half of them, a few hours later. Only writers who are
--    actors reply (the minors' stories get comments but no reply from their writer), and only
--    to a comment that is still there. Replies on one chapter use different lines, like the
--    comments do.
insert into public.comments (id, user_id, chapter_id, parent_comment_id, body, created_at, updated_at)
select md5('demo-2b:reply:' || demo_comments.comment_id)::uuid,
       demo_comments.writer_id,
       demo_comments.chapter_id,
       demo_comments.comment_id,
       lines.body,
       replied_at, replied_at
from demo_comments
join public.comments as parent on parent.id = demo_comments.comment_id and parent.deleted_at is null
join demo_actors as actors on actors.user_id = demo_comments.writer_id
join demo_pool_sizes as sizes
  on sizes.pool = case when demo_comments.line_pool = 'en' then 'en_reply' else 'ro_reply' end
join demo_lines as lines
  on lines.pool = sizes.pool
 and lines.line_number = 1 + (pg_temp.demo_number('reply-lines:' || demo_comments.chapter_id) + demo_comments.place_on_chapter) % sizes.size
cross join lateral (
  select least(now() - interval '10 minutes',
               demo_comments.commented_at + make_interval(hours => 2 + pg_temp.demo_number('replied-at:' || demo_comments.comment_id) % 38))
         as replied_at
) as timing
where pg_temp.demo_number('reply:' || demo_comments.comment_id) % 100 < 45
on conflict (id) do nothing;

-- 10. Emoji reactions on the readers' comments: each other actor reacts to about a third of
--     them, hearts and stars most often (the six kinds are S1-E6-02's).
insert into public.comment_reactions (user_id, comment_id, kind, created_at, updated_at)
select actors.user_id, demo_comments.comment_id,
       (array['heart', 'heart', 'heart', 'star', 'star', 'fire', 'laugh', 'wow'])
         [1 + pg_temp.demo_number('reaction-kind:' || actors.user_id || demo_comments.comment_id) % 8]::public.reaction_kind,
       reacted_at, reacted_at
from demo_comments
join public.comments as existing on existing.id = demo_comments.comment_id and existing.deleted_at is null
cross join demo_actors as actors
cross join lateral (
  select least(now() - interval '5 minutes',
               demo_comments.commented_at + make_interval(hours => 1 + pg_temp.demo_number('reacted-at:' || actors.user_id || demo_comments.comment_id) % 48))
         as reacted_at
) as timing
where actors.user_id <> demo_comments.commenter_id
  and not pg_temp.demo_blocked(actors.user_id, demo_comments.commenter_id)
  and not pg_temp.demo_blocked(actors.user_id, demo_comments.writer_id)
  and pg_temp.demo_number('react:' || actors.user_id || demo_comments.comment_id) % 100 < 33
on conflict (user_id, comment_id) do nothing;

-- 11. Daily read totals for the last 30 days, up to yesterday by the Romanian date (Q7), so
--     today's real reads on staging are never touched. More for popular stories, a burst in the
--     first three days after a chapter comes out, a little less for each later chapter.
insert into public.chapter_reads (chapter_id, read_on, total)
select chapters.chapter_id, days.read_on,
       greatest(0,
         chapters.popularity / 5
         + case when days.read_on - (chapters.published_at at time zone 'Europe/Bucharest')::date < 3
                then 2 * (chapters.popularity / 5) else 0 end
         - (chapters.popularity / 5) * (chapters.position - 1) / 6
         + pg_temp.demo_number('reads:' || chapters.chapter_id || days.read_on) % 5)
from demo_chapters as chapters
cross join lateral (
  select generate_series(
           greatest((chapters.published_at at time zone 'Europe/Bucharest')::date,
                    (now() at time zone 'Europe/Bucharest')::date - 30),
           (now() at time zone 'Europe/Bucharest')::date - 1,
           interval '1 day')::date as read_on
) as days
on conflict (chapter_id, read_on) do nothing;

commit;

-- 12. The check: what the demo accounts did on the demo stories and classics.
select json_build_object(
  'writer_follows', (select count(*) from public.follows_users join public.profiles on profiles.id = follows_users.user_id
                     where profiles.handle in ('adult_writer', 'teacher', 'blocker', 'ana_cu_harti', 'tudor_farasomn',
                                               'ilinca_noaptea', 'radu_din_deal', 'sofia_cerneala')),
  'story_follows', (select count(*) from public.follows_stories join public.stories on stories.id = follows_stories.story_id
                    where stories.slug like '%-demo-__' or stories.slug like '%-classic'),
  'chapter_likes', (select count(*) from public.chapter_likes join public.chapters on chapters.id = chapter_likes.chapter_id
                    where chapters.code like 'd___c___' or chapters.code like 'k___c___'),
  'comments', (select count(*) from public.comments join public.chapters on chapters.id = comments.chapter_id
               where chapters.code like 'd___c___' and comments.parent_comment_id is null),
  'replies', (select count(*) from public.comments join public.chapters on chapters.id = comments.chapter_id
              where chapters.code like 'd___c___' and comments.parent_comment_id is not null),
  'reactions', (select count(*) from public.comment_reactions join public.comments on comments.id = comment_reactions.comment_id
                join public.chapters on chapters.id = comments.chapter_id where chapters.code like 'd___c___'),
  'read_days', (select count(*) from public.chapter_reads join public.chapters on chapters.id = chapter_reads.chapter_id
                where chapters.code like 'd___c___' or chapters.code like 'k___c___')
)::text as after_top_up_2b;
