/**
 * SignUpHero: the left half of the sign-up screen, board 2.1 (story S1-E2-01).
 *
 * Board values (design/boards/Main.dc.html): a handwritten tag in Shadows Into Light Two, the
 * headline "Write stories. Get read." (Q5) with a gold hand-drawn underline under the last words,
 * a lead line and four benefits. The tag on the board says "for writers aged 13 and up"; in March
 * the test is for invited adults (decided 17 Oct 2026, 12:44), so it says that instead.
 * Each benefit has the board's icon in a white rounded square (LOOK-6), decorative: the words say
 * it all. The smiling heart after the tag went with bundle G4 (no doodles).
 * Who uses it: SignUpPage.
 */
import { useTranslation } from 'react-i18next';

import certificateIcon from '@/assets/icons/certificate.svg';
import flagIcon from '@/assets/icons/flag.svg';
import openBookIcon from '@/assets/icons/open-book.svg';
import shieldIcon from '@/assets/icons/shield.svg';

/** The four benefits, in the board's order, each with the board's icon. */
const benefits = [
  { key: 'free', icon: openBookIcon },
  { key: 'yours', icon: certificateIcon },
  { key: 'noTracking', icon: shieldIcon },
  { key: 'person', icon: flagIcon },
] as const;

/**
 * Renders the hero.
 *
 * @returns the hero column
 */
export function SignUpHero() {
  const { t } = useTranslation('auth');
  return (
    <div className="flex max-w-[600px] flex-col gap-5">
      <div className="flex origin-left -rotate-2 items-center gap-2">
        <p className="m-0 font-hand text-[19px] text-eyebrow">{t('signUp.hero.tagMarch')}</p>
      </div>
      <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
        {t('signUp.hero.headingStart')}{' '}
        <span className="relative inline-block">
          {t('signUp.hero.headingEnd')}
          {/* A decorative gold underline, as on the board; hidden from screen readers. */}
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 200 12"
            preserveAspectRatio="none"
            className="absolute -bottom-2 left-0 h-3 w-full text-gold"
          >
            <path
              d="M3 8 C 50 2, 120 2, 197 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </h1>
      <p className="m-0 text-lg leading-[1.6] text-body">{t('signUp.hero.lead')}</p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-[22px] p-0">
        {benefits.map(({ key, icon }) => (
          <li key={key} className="flex items-start gap-4">
            {/* The board's icon in a white rounded square; decorative. */}
            <span
              aria-hidden="true"
              className="inline-flex size-12 flex-none items-center justify-center rounded-2xl border border-border bg-surface"
            >
              <img src={icon} alt="" width={34} height={34} className="block size-[34px]" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-heading text-[19px] font-bold text-heading">
                {t(`signUp.hero.benefits.${key}.title`)}
              </span>
              <span className="text-base text-body">{t(`signUp.hero.benefits.${key}.body`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
