-- Seed data for local and staging databases (story S1-E1-01).
--
-- Who runs it: `npx supabase start` and `npx supabase db reset` load it after the migrations
-- (config.toml, [db.seed]). Staging gets its data the same way, from this file only.
--
-- Rule: synthetic data only. Never copy production data, real people or real email addresses into
-- this file or into staging (story S1-E1-01 acceptance criterion; CLAUDE.md, Safety while building).
-- Every email address must use a reserved test domain (example.com, example.org or .test); the test
-- scripts/seed-is-synthetic.test.ts fails otherwise.
--
-- What comes next: S1-E1-02 adds the seed personas from docs/architecture.md, section 1.7.2, with
-- years of birth worked out from the current year.

select 1; -- Nothing to seed yet; this line keeps the file a valid SQL script.
