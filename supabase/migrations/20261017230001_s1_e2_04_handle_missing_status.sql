-- A new account state: the account has no username yet (story S1-E2-04).
--
-- Why its own migration: Postgres can't use a new enum value in the same transaction that adds
-- it, and account_state() starts returning it in …_s1_e2_04_handles.sql.
-- What it means: someone who signed up and confirmed their email but hasn't chosen a username can
-- read, but can't publish, comment, post or message until they do. A name is needed before
-- anything they write can be shown with it (S1-E2-04: "without a pen name, the handle is
-- displayed").

alter type public.account_status add value if not exists 'handle_missing' before 'legal_acceptance_required';
