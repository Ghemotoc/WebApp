/**
 * SignUpWhatNext: "What you might see next", the rows under the sign-up screen that show what
 * can happen after "Create account" (board 2.1, bundle LOOK-6; rows since CALM-9e, board H01).
 *
 * Only the cards that are true for the current set-up are shown: confirming the email always;
 * the Yoti age check only while the `adults_only` flag is off (in the invited adults' test there
 * is no age check, decided 17 Oct 2026, 12:44); and the "too young" card says "under 18" in that
 * test and "under 13" once sign-up is open to everyone aged 13 and up.
 * The rows preview other screens, so they hold no buttons.
 * Who uses it: SignUpPage. What it calls: the auth locale texts.
 */
import { useTranslation } from 'react-i18next';

/** One preview row: its title and the line under it. */
interface PreviewCard {
  key: string;
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
      title: t('signUp.next.email.title'),
      body: t('signUp.next.email.body'),
    },
  ];
  // Step 2: the age check, only once it is part of sign-up (S1-E2-08).
  if (!isAdultsOnly) {
    cards.push({
      key: 'ageCheck',
      title: t('signUp.next.ageCheck.title'),
      body: t('signUp.next.ageCheck.body'),
    });
  }
  // Step 3: a short preview of the refusal the form shows (AgeRefusal), in its own words.
  cards.push({
    key: 'tooYoung',
    title: isAdultsOnly ? t('signUp.next.under18.title') : t('signUp.next.under13.title'),
    body: isAdultsOnly ? t('signUp.next.under18.body') : t('signUp.next.under13.body'),
  });
  return cards;
}

/**
 * Renders the section.
 *
 * @param props.isAdultsOnly - true while only invited adults may join
 * @returns the heading, the quiet line under it and the rows
 */
export function SignUpWhatNext({ isAdultsOnly }: { isAdultsOnly: boolean }) {
  const { t } = useTranslation('auth');
  const cards = usePreviewCards(isAdultsOnly);
  return (
    <section aria-labelledby="sign-up-next-heading" className="flex flex-col gap-4 pt-10">
      {/* Board H01 (CALM-9e): the heading, then "After you press Create account" as a quiet
          line under it, where the eyebrow used to sit above. */}
      <div className="flex flex-col gap-1">
        <h2 id="sign-up-next-heading" className="m-0 type-heading">
          {t('signUp.next.heading')}
        </h2>
        <p className="m-0 text-[13px] text-meta">{t('signUp.next.note')}</p>
      </div>
      {/* One row each, with a fine line between rows (DoD: label rows); no cards or icons. */}
      <ul className="m-0 flex list-none flex-col p-0">
        {cards.map((card, index) => (
          <li
            key={card.key}
            className={`flex flex-col gap-1 py-4 ${index === 0 ? 'pt-0' : 'border-t border-border'}`}
          >
            <h3 className="m-0 text-base font-bold text-heading">{card.title}</h3>
            <p className="m-0 text-[15px] leading-relaxed text-meta">{card.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
