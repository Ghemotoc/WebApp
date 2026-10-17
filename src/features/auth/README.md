# Auth

Who is signed in, and (from S1-E2-01 and S1-E2-05) signing up, confirming the email and signing in. Started by S1-E14-01.

- `hooks/useSession.ts`: follows the signed-in person through Supabase Auth; answers their user ID (for data caches only, never shown on screen) and whether the first answer has arrived. Without Supabase settings it answers "signed out".

Sign-up (S1-E2-01):

- `components/SignUpPage.tsx`: `/sign-up` and `/join/<code>` (board 2.1): the hero and the card. While `invite_only` is on and there is no working invite, the card shows `InviteGate`; once sent, `CheckYourEmail`; otherwise the steps and `SignUpForm`.
- `components/SignUpForm.tsx` with `PasswordFields`, `YearOfBirthField` and `TermsCheckbox`; `hooks/useSignUpForm.ts` holds the answers and runs the checks.
- `components/ConfirmEmailPage.tsx`: `/auth/confirm`, where the confirmation and log-in emails land.
- `components/AccountLinks.tsx`: the top bar's "Join for free" while signed out.
- `api/signUp.ts` (Supabase Auth), `api/invites.ts` (`check_invite()`), `lib/passwordLeak.ts` (the leaked-password check, ADR 0003), `lib/birthYears.ts`.
- The database side is one trigger (ADR 0002); see `supabase/README.md`, "Sign-up".

Year of birth (S1-E2-02):

- `components/BirthFields.tsx`: the year, the month only when the year leaves the age unclear at 13 or 16, and the inline "Sorry, you can't create an account right now." alert.
- `components/YearOfBirthField.tsx`, `components/MonthOfBirthField.tsx`: the drop-downs, each with the shared `InfoTooltip` explaining why.
- `components/AgeRefusal.tsx`: the full refusal (under 13, or under 18 while `adults_only` is on); the answers are cleared and nothing is sent.
- The rules are in `src/lib/age.ts`, and the database applies the same ones (`sign_up_age_outcome()`).

