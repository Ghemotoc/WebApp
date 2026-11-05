# Runbook: staff sign-in through Google Workspace

Written by S1-E2-07b (bundle 17 CHECK, 5 November 2026). ADR: `docs/adr/0015-staff-sign-in-through-google-workspace.md`.

Until the Vault secret `staff_email_domain` is set, staff sign in with the normal log-in and their staff role (S1-E2-07a). Setting it switches every staff power to Google Workspace sign-in only. Do this before minors go live (GO-LIVE step 7.2), never before Google sign-in works.

## Before you switch it on
1. **Google Workspace admin console:** enforce 2-Step Verification for every staff account (Security › Authentication › 2-Step Verification). This is the staff second factor; we don't ask for another code.
2. **Supabase Auth:** the Google provider is set up and the `social_login` flag is on (GO-LIVE step 5). Manual linking is allowed (Settings › Ways to log in already uses it).
3. **Every staff member** signs in with their normal log-in, opens Settings › Ways to log in and connects their Google account on the staff domain (their work account, not a personal one).
4. **Check that Supabase kept the Workspace domain.** In the SQL editor of the project (staging first), run:

   ```sql
   select p.handle,
          i.identity_data ->> 'email' is not null as has_email,
          coalesce(i.identity_data ->> 'hd', i.identity_data -> 'custom_claims' ->> 'hd') as workspace_domain,
          i.identity_data ->> 'email_verified' as email_verified
   from public.staff_roles r
   join public.profiles p on p.id = r.user_id
   left join auth.identities i on i.user_id = r.user_id and i.provider = 'google';
   ```

   Every staff row needs `workspace_domain` equal to the staff domain and `email_verified` true. If `workspace_domain` is empty for a work account, stop: switching on would lock that person out. Ask the engineer to look at how Supabase stores Google's claims.

## Switch it on
In the SQL editor, as an owner (write the real domain, without "@"):

```sql
select vault.create_secret('<staff domain>', 'staff_email_domain');
```

Then each staff member opens `/staff`: they see "Sign in with your Google Workspace account", press "Continue with Google" and come back with staff powers. A password session no longer has any.

New staff from now on: connect their work Google account first; Staff › Roles refuses a role to an account without one.

## Check it works
- A staff member signed in with a password sees the Google page at `/staff`, and no staff menu.
- After "Continue with Google" with the work account, the staff menu is back.
- The database test `supabase/tests/database/291-staff-workspace-sign-in.test.sql` proves each rule locally.

## Recovery: nobody can get in
Delete the secret in the SQL editor. Staff powers go back to the normal log-in at once:

```sql
delete from vault.secrets where name = 'staff_email_domain';
```

Fix the cause (the Google provider, a missing connection, the `hd` check above), then switch it on again.

## Changing the domain
When the product's own domain is bought and staff move to a new Workspace domain, connect everyone's new Google account first, then update the secret:

```sql
select vault.update_secret(id, '<new staff domain>') from vault.secrets where name = 'staff_email_domain';
```
