/**
 * The sign-up form's rules, shared by the form and (later) any edge function that checks the same
 * answers (story S1-E2-01; architecture 1.5: one zod schema in the browser and on the server).
 *
 * Who uses it: SignUpForm (src/features/auth/components/) checks the answers before sending them.
 * The database checks them again in the sign-up trigger (supabase/migrations/…_s1_e2_01_sign_up_trigger.sql),
 * because the screen is never the protection (architecture 1.1, principle 3).
 * Each message is a translation key in src/locales/<language>/auth.json, so the form shows it in
 * the reader's language.
 */
import { z } from 'zod';

/** At least 10 characters (canvas 2.1; also set in supabase/config.toml and on staging). */
export const minimumPasswordLength = 10;

/** How the person wants to sign in: a password, or a link emailed to them each time. */
export type SignUpMethod = 'password' | 'link';

/** The answers on the form. */
export const signUpSchema = z
  .object({
    method: z.enum(['password', 'link']),
    email: z.email('signUp.errors.emailInvalid'),
    password: z.string(),
    confirmPassword: z.string(),
    birthYear: z.string().regex(/^\d{4}$/, 'signUp.errors.birthYearMissing'),
    acceptsTerms: z.literal(true, 'signUp.errors.termsNotAccepted'),
  })
  // A password is checked only when the person chose one; the emailed link needs none.
  .superRefine((answers, context) => {
    if (answers.method === 'link') return;
    if (answers.password.length < minimumPasswordLength) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'signUp.errors.passwordTooShort',
      });
    }
    if (answers.confirmPassword !== answers.password) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'signUp.errors.passwordsDiffer',
      });
    }
  });

/** The answers once they pass the rules. */
export type SignUpAnswers = z.infer<typeof signUpSchema>;

/** One message per field that failed, as translation keys. */
export type SignUpProblems = Partial<Record<keyof SignUpAnswers, string>>;

/**
 * Checks the answers and lists the first problem of each field.
 *
 * @param answers - what the form holds
 * @returns the problems (an empty object when everything is fine)
 */
export function findSignUpProblems(answers: unknown): SignUpProblems {
  const result = signUpSchema.safeParse(answers);
  if (result.success) return {};
  const problems: SignUpProblems = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof SignUpAnswers;
    problems[field] ??= issue.message;
  }
  return problems;
}
