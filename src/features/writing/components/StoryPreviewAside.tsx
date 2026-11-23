/**
 * StoryPreviewAside: "How readers will see it", the live story card next to the form (story
 * S1-E3-01; board NewStory 4.2, the right-hand aside).
 *
 * Board values: a card with the 300 px cover, the title at 28 px with the pen name, then one
 * meta line (category, language and the labels from S1-E3-06; storyPreviewFacts, CALM-9c), the
 * rating banner when the story is 13+, 16+ or 18+ (S1-E3-06), the blurb, the "Set in" line with
 * its pin (CALM-9, board D02) and the tag line, with
 * "Only you" in bold at the top. Under the card: the line about deleting the story
 * later.
 * Who uses it: NewStoryPage, and StorySettingsPage without the line about deleting later
 * (the delete card is on that page; G9d). On phones it drops below the form.
 */
import { useTranslation } from 'react-i18next';

import { automaticCoverFor } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { MetaLine } from '@/components/ui/MetaLine';
import { ratingMinimumAge } from '@/schemas/story';
import { TagNames } from '@/features/tags/components/TagNames';

import type { StoryAnswers } from '../hooks/storyAnswers';
import { setInPhrase } from '../lib/setInCountries';
import { storyPreviewFacts } from '../lib/storyPreviewFacts';

/** What the aside needs. */
export interface StoryPreviewAsideProps {
  answers: StoryAnswers;
  penName: string;
  /** False on the settings page, where the delete card itself sits below the form. */
  hasDeleteNote?: boolean;
}

/** The board's rating banner: who the story is hidden from (CLAUDE.md rule 18); nothing for All ages. */
function RatingBanner({ rating }: { rating: StoryAnswers['rating'] }) {
  const { t } = useTranslation('writing');
  if (rating === null || rating === 'all_ages') return null;
  return (
    <p className="m-0 rounded-card bg-tint px-3 py-2 type-meta font-semibold text-(--info-text)">
      {t('labels.previewBanner', { rating: t(`rating.${rating}`), age: ratingMinimumAge[rating] })}
    </p>
  );
}

/** "Set in Romania" with the pin (board D02); nothing when no country is chosen. */
function SetInLine({ countries }: { countries: readonly string[] }) {
  const { t, i18n } = useTranslation('writing');
  if (countries.length === 0) return null;
  return (
    <p className="m-0 inline-flex items-center gap-2 type-meta font-semibold text-ink">
      <ActionIcon name="pin" size={14} />
      {t('setIn.preview', { countries: setInPhrase(countries, i18n.language) })}
    </p>
  );
}

/**
 * Renders the aside.
 *
 * @returns the preview card
 */
export function StoryPreviewAside({
  answers,
  penName,
  hasDeleteNote = true,
}: StoryPreviewAsideProps) {
  const { t } = useTranslation('writing');
  const shownTitle = answers.title.trim() === '' ? t('cover.untitled') : answers.title;

  return (
    <aside className="relative flex flex-col gap-3 md:sticky md:top-28">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{t('preview.eyebrow')}</Eyebrow>
        {/* CALM-9c: "Only you" is a bold word, as a meta line's state, not a pill. */}
        <span className="type-meta font-semibold text-ink">{t('preview.onlyYou')}</span>
      </div>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
        {/* A skipped cover shows the automatic design the story gets from its ID (S1-E3-13). */}
        <DrawnCover
          title={shownTitle}
          penName={penName}
          choice={
            answers.cover.kind === 'drawn' ? answers.cover : automaticCoverFor(answers.storyId)
          }
          size="card"
          className="h-[300px] w-full max-w-[188px] self-center"
        />
        <h2 className="m-0 font-heading type-heading leading-[1.1] font-bold text-ink-heading break-words">
          {shownTitle}
        </h2>
        <p className="m-0 type-meta text-ink-muted">{penName}</p>
        {/* CALM-9c: the story's labels as one meta line, as the story page shows them. */}
        <MetaLine facts={storyPreviewFacts(answers, t)} />
        <RatingBanner rating={answers.rating} />
        <p className="m-0 type-body leading-normal text-ink-muted">
          {answers.blurb.trim() === '' ? t('preview.noBlurb') : answers.blurb}
        </p>
        <SetInLine countries={answers.setInCountries} />
        {answers.tags.length > 0 && (
          <p className="m-0 type-meta text-ink-muted">
            <TagNames tags={answers.tags} />
          </p>
        )}
      </div>
      {hasDeleteNote && (
        <p className="m-0 type-meta leading-normal text-ink-muted">{t('preview.deleteLater')}</p>
      )}
    </aside>
  );
}
