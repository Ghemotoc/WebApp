/*
 * Enum value for disqualifying a contest entry (bundle CONTESTS, part b2a; story S1-E11-15
 * criterion 6).
 * In its own file because Postgres can't use a value added to an enum in the same transaction that
 * adds it; the next migration (20270106100002) uses it.
 * - statement_action 'contest_disqualified': staff disqualified a writer's contest entry for
 *   breaking the contest's rules. The writer gets a statement of reasons (S1-E10-04) and can
 *   appeal it (S1-E10-07), as the story asks.
 */
alter type public.statement_action add value if not exists 'contest_disqualified';
