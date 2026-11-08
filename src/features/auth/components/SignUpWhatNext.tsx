/**
 * SignUpWhatNext: "What you might see next", the cards under the sign-up screen that show what
 * can happen after "Create account" (board 2.1, Main.dc.html; bundle LOOK-6).
 *
 * Only the cards that are true for the current set-up are shown: confirming the email always;
 * the Yoti age check only while the `adults_only` flag is off (in the invited adults' test there
 * is no age check, decided 17 Oct 2026, 12:44); and the "too young" card says "under 18" in that
 * test and "under 13" once sign-up is open to everyone aged 13 and up.
 * The cards preview other screens, so they hold no buttons.
 * Who uses it: SignUpPage. What it calls: the auth locale texts and the icon set.
 */
import { useTranslation } from 'react-i18next';

import mailIcon from '@/assets/icons/mail.svg';
import pictureIcon from '@/assets/icons/picture.svg';
import shieldIcon from '@/assets/icons/shield.svg';
import { Eyebrow } from '@/components/ui/Eyebrow';

/** One preview card: its icon, title and the line under it. */
interface PreviewCard {
  key: string;
  icon: string;
  title: string;
  body: string;
}

/**
 * The cards that are true for this set-up, in the board's order.
 *
 * @param isAdultsOnly - true while only invited adults may join (no age check yet)
 * @returns the cards
 */
function usePreviewCards(isAdultsOnly: boolean): PreviewCard[] {
  const { t } = useTranslation('auth');
  // Step 1: confirming the email comes first for everyone (S1-E2-01).
  const cards: PreviewCard[] = [
    {
      key: 'email',
      icon: mailIcon,
      title: t('signUp.next.email.title'),
      body: t('signUp.next.email.body'),
    },
  ];
  // Step 2: the age check, only once it is part of sign-up (S1-E2-08).
  if (!isAdultsOnly) {
    cards.push({
      key: 'ageCheck',
      icon: pictureIcon,
      title: t('signUp.next.ageCheck.title'),
      body: t('signUp.next.ageCheck.body'),
    });
  }
  // Step 3: a short preview of the refusal the form shows (AgeRefusal), in its own words.
  cards.push({
    key: 'tooYoung',
    icon: shieldIcon,
    title: isAdultsOnly ? t('signUp.next.under18.title') : t('signUp.next.under13.title'),
    body: isAdultsOnly ? t('signUp.next.under18.body') : t('signUp.next.under13.body'),
  });
  return cards;
}

/**
 * Renders the section.
 *
 * @param props.isAdultsOnly - true while only invited adults may join
 * @returns the heading and the cards
 */
export function SignUpWhatNext({ isAdultsOnly }: { isAdultsOnly: boolean }) {
  const { t } = useTranslation('auth');
  const cards = usePreviewCards(isAdultsOnly);
  return (
    <section aria-labelledby="sign-up-next-heading" className="flex flex-col gap-5 pt-10">
      <div className="flex items-center gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow>{t('signUp.next.eyebrow')}</Eyebrow>
          <h2
            id="sign-up-next-heading"
            className="m-0 font-heading text-[28px] font-bold tracking-[-0.01em] text-primary"
          >
            {t('signUp.next.heading')}
          </h2>
        </div>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5 p-0">
        {cards.map((card) => (
          <li
            key={card.key}
            className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-6 shadow-card"
          >
            {/* The board's icon on a soft plum square; decorative. */}
            <span
              aria-hidden="true"
              className="inline-flex size-11 items-center justify-center rounded-2xl bg-tint"
            >
              <img src={card.icon} alt="" width={32} height={32} className="block size-8" />
            </span>
            <h3 className="m-0 font-heading text-xl font-bold text-heading">{card.title}</h3>
            <p className="m-0 text-[15px] leading-relaxed text-body">{card.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
