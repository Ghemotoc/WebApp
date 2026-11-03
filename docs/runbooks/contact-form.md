# Contact us: what to set up by hand (S1-E14-04)

The form at `/contact` posts to `/api/contact`, a Cloudflare Pages Function that sends two emails through Brevo. Two things are set by hand, once per environment (staging now, production when it exists).

## 1. The Brevo API key

1. In Brevo: SMTP & API → API keys → Generate a new API key, named for the environment (for example `ghemotoc staging contact form`). Copy it once; keep it in the password manager.
2. In Cloudflare: Workers & Pages → the Pages project → Settings → Variables and Secrets → Add → type Secret, name `BREVO_API_KEY`, the value, for the Production environment (and Preview if the form should work on pull-request previews).
3. The sender address is the support address from the brand settings (`VITE_BRAND_SUPPORT_EMAIL`, today's value when unset). Brevo must have that sender verified (Senders & IP → Senders), or the domain authenticated, or it refuses the email.
4. Redeploy (or wait for the next deploy) so the function sees the secret. Without it the form says "We couldn't send your message right now" and nothing is lost: the person can still email the address shown.

## 2. The rate-limit rule (decided 23 Oct 2026, Q10d)

Cloudflare: the zone (`themagiccoffin.com`, or the product's own domain once it exists) → Security → WAF → Rate limiting rules → Create rule:

- Rule name: `Contact form: 5 messages per 10 minutes`
- If incoming requests match: Field `URI Path`, Operator `equals`, Value `/api/contact`; **And** Field `Request Method`, Operator `equals`, Value `POST`.
  Expression editor form: `(http.request.uri.path eq "/api/contact" and http.request.method eq "POST")`
- With the same characteristics: `IP` (the free plan's only choice).
- When rate exceeds: Requests `5`, Period `10 minutes`.
- Then take action: `Block`, for a duration of `10 minutes`, with the default block page.
- Deploy.

The rule counts requests at Cloudflare's edge and keeps no log we read; the function itself never sees or stores an IP address. Five messages in ten minutes is plenty for a person and little for a script; change the numbers in the rule, not in code.

## 3. Check it worked

Open `/contact` on staging, send a message as a visitor with your own email: the acknowledgement arrives with a reference `C-2026-….`, and the support inbox gets the message with `[C-2026-…] Question` in the subject. Reply from the inbox: the reply goes to the sender (reply-to).

## 4. Saving messages as support tickets (S1-E11-13, bundle ADMIN-2h1)

Each message also becomes a numbered support ticket in the admin site (Staff → Support tickets), and the reference the person sees is the ticket number (#1042). Until this is set, the form keeps working with the old C- reference and nothing is saved.

1. Make a long random value (for example `openssl rand -hex 32`) and keep it in the password manager.
2. Cloudflare: Workers & Pages → the Pages project → Settings → Variables and Secrets → Add → type Secret, name `SUPPORT_TICKET_SECRET`, that value (Production, and Preview if wanted). `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are already there for the front end.
3. Supabase (the same project): SQL editor → `select vault.create_secret('<the same value>', 'support_ticket_secret');`.
4. Redeploy, send one test message from `/contact` and check it shows a `#` number and appears under Staff → Support tickets.

## 5. Support emails in and out (S1-E11-13, bundle ADMIN-2h2)

Out needs nothing new: the acknowledgements and staff answers use the notification emails' worker (`EMAIL_WORKER_KEY` and `BREVO_API_KEY` on Cloudflare, `email_worker_url` and `email_worker_key` in the Vault, `docs/runbooks/scheduled-jobs.md`). `run-support-email-worker` calls the same address with `/api/support-emails` at the end, every minute while emails are due. They come from the support inbox with `[#1042]` in the subject, and answers go back to it.

In needs three steps, so a person's answer lands back in their ticket instead of only in the mailbox:

1. Make another long random value (`openssl rand -hex 32`) and add it on Cloudflare as the Secret `SUPPORT_INBOUND_KEY` (section 4 already set `SUPPORT_TICKET_SECRET`, which signs each email for the database). Redeploy.
2. Brevo: Transactional → Settings → Inbound parsing (Brevo's own help names the current menu) → add an inbound domain or address on a subdomain you control (for example `inbox.<domain>`, with the MX records Brevo shows), and set the webhook to `https://<site>/api/support-inbound?key=<that value>`.
3. Google Workspace: forward a copy of everything sent to the support inbox to that Brevo address (Gmail → Settings → Forwarding, or an admin routing rule), so staff still see the mailbox while tickets fill in.

Check it: write to the support inbox from a personal address. A ticket marked "Email only" appears under Staff → Support tickets, and you get an acknowledgement in Romanian and English with `[#…]` in the subject. Answer it from the ticket page ("Waiting to be emailed" turns to "Emailed" within a minute), then reply to that email: the reply joins the same ticket, marked "by email".

Automatic replies (out-of-office, mailing lists) are saved but never acknowledged, and one address gets at most 3 acknowledgements an hour, so two auto-responders can't answer each other forever. Until steps 1 to 3 are done, emails to the inbox stay only in the mailbox, as before.
