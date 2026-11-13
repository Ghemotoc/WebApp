/*
 * Enum value for the Readers' choice certificate (bundle CLASS-POINTS, part 3; story S1-E8-17;
 * Robert, 13 Nov 2026, 19:26 UTC, decision 16).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100230) uses it in a column, a constraint and its functions.
 * - certificate_result 'readers_choice': the second certificate a pupil gets when classmates gave
 *   their competition chapters the most class points and the teacher's Winner is someone else.
 *   It is only ever a certificate's result, never a competition result (the next migration adds
 *   the check).
 */
alter type public.certificate_result add value if not exists 'readers_choice';
