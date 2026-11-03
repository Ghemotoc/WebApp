/**
 * StoryContestCard: "Contests" in a story's settings, where a writer enters the story in a
 * contest that takes entries now, or withdraws it before entries close (story S1-E11-15 criteria
 * 3 and 4; bundle CONTESTS-13b1).
 *
 * What it shows: nothing when no contest takes this writer's entries today. Otherwise one block
 * per contest: its name, the closing day, a link to its page, and either "Enter <contest>", the
 * entered state with "Withdraw entry", the other story already entered (one entry per writer), or
 * why this story can't be entered. Changes save at once, apart from the form's Save button, so
 * every button is type="button" (the card sits inside the settings form).
 * Who shows it: StorySettingsPage, after the class card.
 * What it calls: useStoryContests() → contest_entry_options(), enter_contest(),
 * withdraw_contest_entry().
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { FormSection } from '@/features/writing/components/FormSection';
import type { ContestEntryOption } from '@/schemas/contests';

import { useStoryContests } from '../hooks/useStoryContests';
import { contestDayInWords, contestNameIn } from '../lib/contestWords';
import { useContestTranslation } from '../registerContestTranslations';

/** The card's state from the hook. */
type StoryContests = ReturnType<typeof useStoryContests>;

/** The action part of one contest: enter, withdraw, or why not. */
function ContestAction({
  option,
  contests,
}: {
  option: ContestEntryOption;
  contests: StoryContests;
}) {
  const { t, i18n } = useContestTranslation();
  const name = contestNameIn(option, i18n.language);
  // Step 1: this story is the writer's entry: they may withdraw it while entries are open.
  if (option.entry?.is_this_story === true) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 text-sm font-semibold text-ink">{t('card.entered')}</p>
        <Button
          type="button"
          variant="secondary"
          disabled={contests.isRunning}
          onClick={() => contests.change({ kind: 'withdraw', contestId: option.id })}
        >
          {t('card.withdraw', { name })}
        </Button>
      </div>
    );
  }
  // Step 2: another of their stories is entered: one entry per writer (proposal).
  if (option.entry !== null) {
    return (
      <p className="m-0 text-sm text-body">
        {t('card.otherStory', { title: option.entry.story_title })}
      </p>
    );
  }
  // Step 3: this story can't enter, and the card says why.
  if (option.problems.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        <p className="m-0 text-sm text-body">{t('card.cantEnter')}</p>
        <ul className="m-0 pl-5 text-sm text-body">
          {option.problems.map((problem) => (
            <li key={problem}>{t(`card.problems.${problem}`)}</li>
          ))}
        </ul>
      </div>
    );
  }
  // Step 4: it may enter.
  return (
    <div>
      <Button
        type="button"
        disabled={contests.isRunning}
        onClick={() => contests.change({ kind: 'enter', contestId: option.id })}
      >
        {t('card.enter', { name })}
      </Button>
    </div>
  );
}

/** One contest: its name, closing day, link and action. */
function ContestBlock({
  option,
  contests,
}: {
  option: ContestEntryOption;
  contests: StoryContests;
}) {
  const { t, i18n } = useContestTranslation();
  const name = contestNameIn(option, i18n.language);
  return (
    <div className="flex flex-col gap-2 border-t border-hairline pt-4 first:border-t-0 first:pt-0">
      <h3 className="m-0 font-heading text-[18px] font-bold text-heading">{name}</h3>
      <p className="m-0 text-sm text-body">
        {t('card.closesOn', { date: contestDayInWords(option.closes_on, i18n.language) })}
        {option.word_limit === null
          ? ''
          : ` ${t('card.wordLimit', { limit: option.word_limit.toLocaleString(i18n.language) })}`}
      </p>
      <Link
        to={`/c/${option.page_slug}`}
        className="w-fit text-sm font-semibold text-link underline"
      >
        {t('card.about', { name })}
      </Link>
      <ContestAction option={option} contests={contests} />
    </div>
  );
}

/** The outcome of the last change, under the contests. */
function ChangeNotice({ contests }: { contests: StoryContests }) {
  const { t } = useContestTranslation();
  if (contests.failure !== null) {
    return (
      <Notice tone="error">
        {t(`card.failures.${contests.failure.reason}`, { defaultValue: t('card.failures.failed') })}
      </Notice>
    );
  }
  if (!contests.isDone || contests.lastChange === null) return null;
  const text = contests.lastChange.kind === 'enter' ? t('card.entrySaved') : t('card.withdrawn');
  return <Notice tone="success">{text}</Notice>;
}

/**
 * Renders the card, or nothing when no contest takes this writer's entries today.
 *
 * @param props.slug - the writer's story
 * @returns the section card
 */
export function StoryContestCard({ slug }: { slug: string }) {
  const { t } = useContestTranslation();
  const contests = useStoryContests(slug);
  const options = contests.options.data ?? [];
  if (options.length === 0) return null;
  return (
    <FormSection legend={t('card.legend')}>
      <p className="m-0 max-w-[640px] text-sm leading-normal text-body">{t('card.intro')}</p>
      <div aria-live="polite" className="flex flex-col gap-4">
        {options.map((option) => (
          <ContestBlock key={option.id} option={option} contests={contests} />
        ))}
        <ChangeNotice contests={contests} />
      </div>
    </FormSection>
  );
}
