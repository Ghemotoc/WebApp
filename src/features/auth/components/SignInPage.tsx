/**
 * SignInPage: log in, screen 2.2 (story S1-E2-05; design/boards/SignIn.dc.html).
 *
 * Who shows it: the router, at /sign-in; the top bar's "Log in" and sign-up's "Already have an
 * account? Log in" link here.
 * What it shows: email and password (with Show / Hide), "Forgot your password?", "Log in",
 * "Email me a log-in link" and "New here? Join for free". Above the form, the Google, Apple,
 * Microsoft and passkey buttons (OtherWaysToLogIn, S1-E2-09) show only while their flags are on.
 * What it calls: useSignInForm → api/signIn.ts. After a successful log-in it goes to the page named
 * by `?next=` when that is a page on this site (lib/nextPath.ts; the admin site's "Sign in again",
 * DASH-1), otherwise to the home page.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { useSignInForm } from '../hooks/useSignInForm';
import { pathAfterSignIn } from '../lib/nextPath';

import { AuthCard } from './AuthCard';
import { OtherWaysToLogIn } from './OtherWaysToLogIn';
import { SignInForm } from './SignInForm';

/**
 * Renders the page.
 *
 * @returns the log-in screen
 */
export function SignInPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const form = useSignInForm();
  const [searchParams] = useSearchParams();
  // Only a page on this site; anything else goes home (lib/nextPath.ts).
  const nextPath = pathAfterSignIn(searchParams.get('next'));

  // Logged in: go to that page, where the database decides what the person may do.
  useEffect(() => {
    if (form.message?.kind === 'signed_in') void navigate(nextPath);
  }, [form.message, navigate, nextPath]);

  return (
    <AuthCard
      documentTitle={t('signIn.documentTitle')}
      eyebrow={t('signIn.eyebrow')}
      heading={t('signIn.heading')}
      intro={t('signIn.subheading')}
      doodle="teacup"
    >
      <OtherWaysToLogIn onSignedIn={() => void navigate(nextPath)} />
      <SignInForm form={form} />
      <p className="m-0 text-sm text-body">
        {t('signIn.newHere')}{' '}
        <Link to="/sign-up" className="text-link underline">
          {t('signIn.join')}
        </Link>
      </p>
    </AuthCard>
  );
}
