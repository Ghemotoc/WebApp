# The public report form: what to set up by hand (S1-E10-02)

The form at `/report` posts to `/api/notice`, a Cloudflare Pages Function that signs the notice
and saves it through `submit_public_notice()`, then emails the acknowledgement through Brevo. The
database refuses any notice not signed with the shared secret, so the bot check can't be skipped by
calling the database directly. Three things are set by hand, once per environment.

## 1. The shared secret

1. Make a long random value (for example a 64-character password from the password manager).
   Keep it there; it is never written into the repository.
2. Supabase dashboard → the staging project → SQL Editor → New query →
   `select vault.create_secret('<the value>', 'public_notice_secret');` → Run.
   (To change it later: `select vault.update_secret(id, '<new value>') from vault.secrets where name = 'public_notice_secret';`.)
3. Cloudflare: Workers & Pages → the Pages project → Settings → Variables and Secrets → Add →
   type Secret, name `NOTICE_SECRET`, the same value, for Production (and Preview if previews
   should accept notices).
4. Redeploy. Without the secret the form says "We couldn't save the report just now" and gives
   the support address.

`BREVO_API_KEY` is the same key the Contact us form uses (`docs/runbooks/contact-form.md`).

## 2. The rate-limit rule

Cloudflare: the zone → Security → WAF → Rate limiting rules → Create rule:

- Rule name: `Report form: 10 per 10 minutes`
- Expression: `(http.request.uri.path eq "/api/notice" and http.request.method eq "POST")`
- Characteristics: `IP`. Rate: `10` requests per `10 minutes`. Action: `Block` for `10 minutes`.
- Deploy.

Ten is higher than Contact us so an authority sending several orders is never blocked. The
function never sees or stores an IP address.

## 3. Check it worked

Open `/report` on staging, choose "Removal order from an authority", fill it with your own email
and an address like `/u/<a test username>`, and send. You get the acknowledgement with a `TCO-`
reference and the time of receipt; the support inbox gets `[TCO-…] Removal order received: act
within one hour`; the staff queue shows it under "Removal orders received in the last 7 days".
Close the case afterwards.
