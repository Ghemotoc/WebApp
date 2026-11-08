/**
 * SignUpPrompt: the card after a teaser, asking a visitor to log in to read on (story S1-E4-04;
 * board 3.8, "Join for free to read on").
 *
 * March wording: the March test is for invited adults only (decided 17 Oct 2026, 12:44), so the
 * board's public-launch copy (sign up with Google, Apple or Microsoft, the Yoti age check, parents
 * for under-16s) is replaced by "log in, or join with the link in your invitation"
 * (docs/board-fixes.md). The board's "Join for free" button needs an invitation link, so the card
 * offers "Log in" and "Back to the story". The apps line stays: the web comes first, the apps
 * after (decided 17 Oct 2026, 34o); its "About the apps" link waits for S1-E16-01.
 * Who uses it: TeaserPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { brand } from '@/config/brand';

/** What the card needs. */
interface SignUpPromptProps {
  storySlug: string;
  /** How many readable chapters come after this one. */
  chaptersAfter: number;
}

/**
 * Renders the prompt.
 *
 * @returns the card
 */
export function SignUpPrompt({ storySlug, chaptersAfter }: SignUpPromptProps) {
  const { t } = useTranslation('reading');
  return (
    <section
      aria-labelledby="teaser-prompt-title"
      className="relative flex flex-col gap-4 rounded-[24px] border border-border bg-surface p-6 shadow-[0_8px_24px_rgba(72,28,95,0.08)] sm:p-8"
    >
      <div className="flex flex-col gap-3">
        {chaptersAfter > 0 && (
          <Eyebrow>{t('teaser.moreChapters', { count: chaptersAfter })}</Eyebrow>
        )}
        <h2
          id="teaser-prompt-title"
          className="m-0 font-heading text-[26px] font-bold text-heading"
        >
          {t('teaser.promptTitle')}
        </h2>
        <p className="m-0 text-[15px] leading-[1.6] text-body">
          {t('teaser.promptBody', { productName: brand.productName })}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to="/sign-in"
            className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
          >
            {t('reader.signIn')}
          </Link>
          <Link
            to={`/s/${storySlug}`}
            className="inline-flex h-11 items-center rounded-full button-glass px-5 text-sm font-semibold no-underline"
          >
            {t('reader.backToStory')}
          </Link>
        </div>
      </div>
      <p className="m-0 border-t border-border pt-4 text-sm text-body">
        {t('teaser.appsNote', { productName: brand.productName })}
      </p>
    </section>
  );
}
