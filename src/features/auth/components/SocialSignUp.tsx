/**
 * SocialSignUp: the bottom of the sign-up form, "or sign up with" Google, Apple or Microsoft
 * (story S1-E2-09; board Main.dc.html, "Social sign-up: replaces the password only").
 *
 * A provider only replaces the password: the year of birth, the username and the terms on the
 * form above are still needed, and the age check still follows (criterion 1). The line under the
 * buttons says so, because Google, Apple and Microsoft don't tell us how old someone is.
 * Who shows it: SignUpForm, while the social_login flag is on.
 * What it calls: useSignUpForm's continueWith(), which checks the answers and leaves for the
 * provider.
 */
import { useTranslation } from 'react-i18next';

import type { useSignUpForm } from '../hooks/useSignUpForm';

import { OrDivider } from './OrDivider';
import { SocialButtons } from './SocialButtons';

/**
 * Renders the divider, the buttons and the age line.
 *
 * @param props.form - useSignUpForm's result
 * @returns the provider part of the form
 */
export function SocialSignUp({ form }: { form: ReturnType<typeof useSignUpForm> }) {
  const { t } = useTranslation('auth');
  return (
    <>
      <OrDivider label={t('social.orSignUpWith')} />
      <SocialButtons
        groupLabel={t('social.signUpGroup')}
        isBusy={form.isSending}
        onChoose={(provider) => void form.continueWith(provider)}
      />
      <p className="m-0 flex items-start gap-[10px] text-sm leading-[1.55] text-body">
        {/* An information icon: status icons stay ordinary icons (DoD design rules). */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-0.5 flex-none text-link"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>{t('social.ageLine')}</span>
      </p>
    </>
  );
}
