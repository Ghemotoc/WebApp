/*
 * Migration: the values a support ticket can take (story S1-E11-13, part 13a; bundle ADMIN-2h1).
 *
 * Why a migration of its own: Postgres can't use a new enum value in the same transaction that
 * adds it, so the enums come first and the tables and functions follow in
 * 20261226100002_admin2_h1_support_tickets.sql.
 * The lists come from the story's fourth criterion (status, priority, category) and its first
 * (the channel a ticket arrived by).
 * Who reads them: the support ticket tables and functions, and the generated types in the app.
 */

/** Where a ticket is in its life (criterion 4: New, Open, Pending on user, On hold, Solved, Closed). */
create type public.support_ticket_status as enum (
  'new', 'open', 'pending_on_user', 'on_hold', 'solved', 'closed'
);
comment on type public.support_ticket_status is
  'Where a support ticket is in its life (S1-E11-13 criterion 4).';

/** How urgent a ticket is (criterion 4). */
create type public.support_ticket_priority as enum ('low', 'normal', 'high', 'urgent');
comment on type public.support_ticket_priority is 'How urgent a support ticket is (S1-E11-13 criterion 4).';

/** What a ticket is about (criterion 4). */
create type public.support_ticket_category as enum (
  'account', 'writing', 'reading', 'safety_question', 'school_or_university', 'bug', 'other'
);
comment on type public.support_ticket_category is 'What a support ticket is about (S1-E11-13 criterion 4).';

/** How a ticket arrived (criterion 1: an email, the Contact us form or the app). */
create type public.support_ticket_channel as enum ('email', 'contact_form', 'in_app');
comment on type public.support_ticket_channel is 'How a support ticket arrived (S1-E11-13 criterion 1).';

/** Who wrote one message of a ticket. */
create type public.support_message_kind as enum ('from_requester', 'staff_reply', 'internal_note');
comment on type public.support_message_kind is
  'Who wrote a support ticket message: the person asking, staff answering, or a staff-only note (S1-E11-13 criteria 3 and 5).';
