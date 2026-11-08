/**
 * RemindMeBlock: a landing page's Remind me block (story S1-E11-14 criterion 8; bundle
 * CONTESTS-13a2b).
 *
 * A signed-in reader taps "Remind me" and gets one in-app notification on the day entries open,
 * and nothing else; they can cancel it. A visitor who isn't signed in is asked to sign in. Once
 * entries are open the block says so instead of offering a reminder. No countdown and no "only
 * today": copy aimed at minors must not pressure them (story legal notes).
 * Who shows it: LandingBlockView. What it calls: useLandingReminder() and useSession().
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { LandingBlock, LandingLanguage, LandingReminder } from '@/schemas/landingPages';

import type { LandingExtras } from '../api/landingPages';
import { useLandingReminder } from '../hooks/useLandingReminder';
import { wordsOf } from '../lib/blocks';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

/** The class of the sign-in link, drawn as a secondary button. */
const linkButtonClass =
  'inline-flex h-11 items-center self-start rounded-full button-glass px-5 text-sm font-semibold no-underline';

/** What the block needs. */
interface RemindMeBlockProps {
  block: LandingBlock;
  language: LandingLanguage;
  /** The page's address and the reader's state; null in the editor's preview. */
  reminder: LandingExtras['reminder'];
}

/** What the action part needs: the page's address and the reader's state. */
interface ReminderActionProps {
  pageSlug: string;
  state: LandingReminder;
  language: LandingLanguage;
}

/**
 * The opening day in words, in the page's language.
 *
 * @param day - an ISO date (YYYY-MM-DD)
 * @param language - the page's language
 * @returns the date as readers read it
 */
function dayInWords(day: string, language: LandingLanguage): string {
  // Noon UTC keeps the date the same in Romanian time.
  return formatRomaniaDate(new Date(`${day}T12:00:00Z`), language);
}

/**
 * The button, the "you'll be reminded" line or the sign-in link.
 *
 * @returns the action
 */
function ReminderAction({ pageSlug, state, language }: ReminderActionProps) {
  const { t } = useLandingPageTranslation();
  const session = useSession();
  const reminder = useLandingReminder(pageSlug);
  const opensOn = state.opens_on === null ? '' : dayInWords(state.opens_on, language);
  // Step 1: entries are open already, so there is nothing to remind about.
  if (state.is_open) return <p className="m-0 text-ink">{t('remindMe.open')}</p>;
  // Step 2: a visitor who isn't signed in is asked to sign in first.
  if (session.userId === null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="m-0 text-ink">{t('remindMe.signIn', { date: opensOn })}</p>
        <Link to="/sign-in" className={linkButtonClass}>
          {t('remindMe.signInLink')}
        </Link>
      </div>
    );
  }
  // Step 3: the reader asks, or sees that they asked and may cancel.
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {state.is_set ? (
        <p className="m-0 text-ink">{t('remindMe.isSet', { date: opensOn })}</p>
      ) : (
        <p className="m-0 text-ink">{t('remindMe.offer', { date: opensOn })}</p>
      )}
      <Button
        className="self-start"
        variant={state.is_set ? 'secondary' : 'primary'}
        disabled={reminder.isPending}
        onClick={() => reminder.mutate(!state.is_set)}
      >
        {state.is_set ? t('remindMe.cancel') : t('remindMe.ask')}
      </Button>
      {reminder.isError ? <Notice tone="error">{t('remindMe.failed')}</Notice> : null}
    </div>
  );
}

/**
 * Renders the block: its heading, its introduction and the action (a note in the preview).
 *
 * @returns the section
 */
export function RemindMeBlock({ block, language, reminder }: RemindMeBlockProps) {
  const { t } = useLandingPageTranslation();
  const intro = wordsOf(block, language, 'intro');
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5">
      <h2 className="m-0 font-heading text-[26px] font-bold text-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      {intro === '' ? null : <p className="m-0 text-ink">{intro}</p>}
      {reminder === null || reminder.state === null ? (
        <p className="m-0 text-meta">{t('remindMe.previewNote')}</p>
      ) : (
        <ReminderAction pageSlug={reminder.pageSlug} state={reminder.state} language={language} />
      )}
    </section>
  );
}
