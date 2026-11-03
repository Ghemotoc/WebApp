# Throwaway email domains

`blocklist.conf` lists email domains that hand out throwaway addresses. A new account can't use one
(bundle ADMIN-2, part f1; Robert's brief of 2 Nov 2026, section 6), so a banned person can't simply
make a fresh address to come back.

- **Source:** the public list at https://github.com/disposable-email-domains/disposable-email-domains
  (`disposable_email_blocklist.conf`), copied on 3 Nov 2026, 10,123 domains.
- **Licence:** CC0 1.0 (public domain dedication): no rights reserved, no attribution needed. We
  name the source anyway so it can be refreshed.
- **Loaded by:** `supabase/migrations/20261223100002_admin2_f1_disposable_domains.sql` into the
  `disposable_email_domains` table. Read by `email_domain_allowed()` and the sign-up trigger.
- **A domain wrongly on the list:** add it to the `disposable_email_allow` setting (a list of
  domains); don't edit the copy here, so the next refresh doesn't bring it back.
- **Refreshing:** copy the new list here, and add a migration that inserts it with
  `on conflict (domain) do nothing`.
