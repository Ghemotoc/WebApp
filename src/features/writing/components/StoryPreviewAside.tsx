/**
 * StoryPreviewAside: "How readers will see it", the live story card next to the form (story
 * S1-E3-01; board NewStory 4.2, the right-hand aside).
 *
 * Board values: a card with the 300 px cover, the title at 28 px with the pen name, then the
 * chips (category, language; status, where-to-read, labels and rating join with S1-E3-05 and
 * S1-E3-06), the blurb and the tag line, with an "Only you" lock pill at the top. Under the
 * card: the line about deleting the story later.
 * Who uses it: NewStoryPage. On phones it drops below the form.
 */
import { useTranslation } from 'react-i18next';

import { DrawnCover } from '@/components/covers/DrawnCover';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';

import type { NewStoryAnswers } from '../hooks/useNewStoryForm';

/** What the aside needs. */
export interface StoryPreviewAsideProps {
  answers: NewStoryAnswers;
  penName: string;
}

/**
 * Renders the aside.
 *
 * @returns the preview card
 */
export function StoryPreviewAside({ answers, penName }: StoryPreviewAsideProps) {
  const { t } = useTranslation('writing');
  const shownTitle = answers.title.trim() === '' ? t('cover.untitled') : answers.title;

  return (
    <aside className="relative flex flex-col gap-3 md:sticky md:top-6">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{t('preview.eyebrow')}</Eyebrow>
        <InfoPill tone="neutral">{t('preview.onlyYou')}</InfoPill>
      </div>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
        {answers.cover.kind === 'drawn' ? (
          <DrawnCover
            title={shownTitle}
            penName={penName}
            choice={answers.cover}
            size="card"
            className="h-[300px] w-full max-w-[188px] self-center"
          />
        ) : (
          // S1-E3-13 draws the automatic cover from the story's ID once the story exists.
          <div className="flex h-[300px] w-full max-w-[188px] items-center justify-center self-center rounded-cover border border-dashed border-dashed-border bg-panel p-4 text-center text-sm text-meta">
            {t('preview.automaticCover')}
          </div>
        )}
        <h2 className="m-0 font-heading text-[22px] leading-[1.1] font-bold text-heading break-words">
          {shownTitle}
        </h2>
        <p className="m-0 text-[13px] text-meta">{penName}</p>
        <div className="flex flex-wrap gap-1.5">
          <InfoPill tone="plum">
            {t(`categories.${answers.categorySlug}`, { defaultValue: answers.categorySlug })}
          </InfoPill>
          <InfoPill tone="neutral">
            <span lang={answers.languageCode}>
              {t(`languages.${answers.languageCode}`, { defaultValue: answers.languageCode })}
            </span>
          </InfoPill>
        </div>
        <p className="m-0 text-sm leading-normal text-body">
          {answers.blurb.trim() === '' ? t('preview.noBlurb') : answers.blurb}
        </p>
        {answers.tags.length > 0 && (
          <p className="m-0 text-[13px] text-meta">{answers.tags.join(' · ')}</p>
        )}
      </div>
      <p className="m-0 text-[13px] leading-normal text-meta">{t('preview.deleteLater')}</p>
      <Doodle
        name="owl-reading-glasses"
        kind="widget"
        on="How readers will see it"
        hideBelow="wide"
        className="absolute -bottom-24 right-2 w-24"
      />
    </aside>
  );
}
