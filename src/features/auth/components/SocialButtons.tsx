/**
 * SocialButtons: "Continue with Google", "Continue with Apple" and "Continue with Microsoft"
 * (story S1-E2-09; boards SignIn.dc.html "Log in another way" and Main.dc.html "Join with another
 * account").
 *
 * Each button carries the provider's own full-colour logo, unchanged (DoD design rules: brand
 * logos are never redrawn or recoloured). The buttons stay light in night mode too, because the
 * providers' brand guidelines ask for their logo on a light or black button, never on our colours.
 * Who shows it: SignUpForm and SocialLogIn, only while the social_login flag is on.
 * What it calls: onChoose, with the provider; the caller decides between sign-up and log-in.
 */
import { useTranslation } from 'react-i18next';

import appleLogo from '@/assets/brands/apple.svg';
import googleLogo from '@/assets/brands/google.svg';
import microsoftLogo from '@/assets/brands/microsoft.svg';

import { socialProviders, type SocialProvider } from '../api/socialSignIn';

/** Each provider's logo file. */
const logoOf: Record<SocialProvider, string> = {
  google: googleLogo,
  apple: appleLogo,
  azure: microsoftLogo,
};

/** Each provider's button text key in auth.json. */
const labelKeyOf: Record<SocialProvider, string> = {
  google: 'social.continueWithGoogle',
  apple: 'social.continueWithApple',
  azure: 'social.continueWithMicrosoft',
};

/** What the buttons need. */
interface SocialButtonsProps {
  /** The group's name for screen readers ("Log in another way"). */
  groupLabel: string;
  /** Called with the provider pressed. */
  onChoose: (provider: SocialProvider) => void;
  /** True while a sign-up or log-in is on its way, so a second press does nothing. */
  isBusy: boolean;
}

/**
 * Renders the three buttons.
 *
 * @returns a labelled group of buttons
 */
export function SocialButtons({ groupLabel, onChoose, isBusy }: SocialButtonsProps) {
  const { t } = useTranslation('auth');
  return (
    <div role="group" aria-label={groupLabel} className="flex flex-col gap-[10px]">
      {socialProviders.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={isBusy}
          onClick={() => onChoose(provider)}
          className="inline-flex h-12 items-center justify-center gap-3 rounded-full border border-[#8E7B99] bg-white px-5 font-body text-[15px] font-semibold text-[#1F1F1F] hover:bg-[#F4F0EC] disabled:opacity-60"
        >
          <img src={logoOf[provider]} alt="" aria-hidden="true" width={20} height={20} />
          {t(labelKeyOf[provider])}
        </button>
      ))}
    </div>
  );
}
