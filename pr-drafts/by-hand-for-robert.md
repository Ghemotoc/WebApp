# By hand for Robert

Newest at the top. One line each.

- **SAFE-2 (#200, merged):** the public report form needs one shared secret, set in two places, plus a rate limit. (1) Make a long random value in your password manager. (2) Supabase dashboard > staging project > SQL Editor > New query > `select vault.create_secret('<that value>', 'public_notice_secret');` > Run. (3) Cloudflare > Workers & Pages > ghemotoc > Settings > Variables and Secrets > Add > type Secret, name `NOTICE_SECRET`, the same value, Production > Save, then Deployments > Retry the latest. (4) Cloudflare > the domain > Security > WAF > Rate limiting rules > Create rule "Report form: 10 per 10 minutes": path equals `/api/notice`, method POST, by IP, 10 requests per 10 minutes, Block for 10 minutes > Deploy. Full steps: `docs/runbooks/notice-form.md`. No SQL top-up this time.
- **PEOPLE-1 (#199, merged):** Supabase dashboard > staging project > SQL Editor > New query > paste `supabase/staging-topups/PEOPLE-1.sql` from main > Run, and expect `people_1_ready | t`.
