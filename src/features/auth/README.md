# Auth

Who is signed in, signing up, confirming the email, logging in and out, and password resets. Started by S1-E14-01; built by S1-E2-01, S1-E2-02 and S1-E2-05.

- `hooks/useSession.ts`: follows the signed-in person through Supabase Auth; answers their user ID (for data caches only, never shown on screen) and whether the first answer has arrived. Without Supabase settings it answers "signed out".

Sign-up (S1-E2-01):

- `components/SignUpPage.tsx`: `/sign-up` and `/join/<code>` (board 2.1): the hero and the card. While `invite_only` is on and there is no working invite, the card shows `InviteGate`; once sent, `CheckYourEmail`; otherwise the steps and `SignUpForm`. `hooks/useInviteGateForm.ts` keeps the gate's code field: an empty code gets its own error, and after a code that didn't work the field keeps it, takes the focus and shows why (S1-E2-QA).
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

Logging in (S1-E2-05):

- `components/SignInPage.tsx` with `SignInForm`, `PasswordInput` (Show / Hide) and `SignInMessage`: `/sign-in` (board 2.2). `hooks/useSignInForm.ts` holds the answers.
- `components/ForgotPasswordPage.tsx` (`/forgot-password`, `hooks/useResetRequest.ts`, `SendProblem`) and `ResetPasswordPage.tsx` with `NewPasswordForm` (`/reset-password`, `hooks/useNewPasswordForm.ts`). `AuthCard` is the card all three share.
- `components/AccountMenu.tsx`: the top bar's account button (Settings, Log out); `AccountLinks` shows "Log in" and "Join for free" while signed out.
- `api/signIn.ts` (log in with the pause, log-in and reset links, new password, log out), `api/sessions.ts` (`list_my_sessions()`, `end_my_session()`), `lib/emailHash.ts`, `lib/deviceName.ts`.
- Settings › Signed-in devices lives in `src/features/account/` (`SignedInDevicesSection`, `DeviceRow`, `hooks/useMySessions.ts`).

Country from the connection (S1-E2-10):

- `hooks/useSignUpMarket.ts` with `api/signupContext.ts`: the country and its signed token from `/api/signup-context` (`functions/api/signup-context.ts`, `server/signup-context.ts`), and the public `markets`. Once sign-up is public, a closed or unknown country goes to `components/NotOpenPage.tsx` (`/not-open`); the invited test admits every country.
- `components/AgeRefusal.tsx` also refuses someone under their country's minimum age (16 in Australia, Q19); `src/lib/age.ts` has `isUnderMarketAge()`.
- `components/SignUpCardFlow.tsx`: the changing part of the sign-up card (invite gate or form).

