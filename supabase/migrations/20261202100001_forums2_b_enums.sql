/*
 * FORUMS-2b enums (bundle FORUMS-2, part b; story S1-E8-07: space moderators and permissions).
 *
 * A new enum value can't be used in the same transaction that adds it, so it gets its own
 * migration before 20261202100002_forums2_b_space_moderators.sql uses it.
 * - space_member_role 'moderator': a member the owner appointed with one or more powers.
 */
alter type public.space_member_role add value if not exists 'moderator';
