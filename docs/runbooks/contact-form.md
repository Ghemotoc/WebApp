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
