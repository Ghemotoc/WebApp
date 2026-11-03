/**
 * PictureToCheckCard: one waiting picture on Moderation › Pictures to check (bundle ADMIN-2, part
 * e1b; Robert's brief of 2 Nov 2026, section 3).
 *
 * The picture is shown large, with no download button. The uploader appears by handle and age
 * group only, never the year of birth (architecture 1.8.3). Below it: what the picture is, its
 * story and rating, how long it has waited, then the three decisions. Plain components, no doodles.
 * Who shows it: PicturesToCheckPage. What it shows next: PictureDecisionButtons.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';

import type { PictureDecision, PictureToCheck } from '../api/picturesToCheck';

import { PictureDecisionButtons } from './PictureDecisionButtons';

/** What the card needs. */
export interface PictureToCheckCardProps {
  picture: PictureToCheck;
  reasons: string[];
  isDeciding: boolean;
  onDecide: (decision: PictureDecision) => void;
}

/**
 * The picture itself, or a line when Storage refused the address.
 *
 * @returns the picture block
 */
function LargePicture({ picture }: { picture: PictureToCheck }) {
  const { t } = useTranslation('moderation');
  if (picture.url === null) return <p className="m-0 text-body">{t('picture.unreadable')}</p>;
  return (
    <img
      src={picture.url}
      alt={t('pictures.alt', { handle: picture.uploaderHandle })}
      draggable={false}
      className="max-h-[560px] w-full rounded-[12px] border border-border bg-tint object-contain"
    />
  );
}

/**
 * The story row: its title, linked, and its rating; "Not in a story" for a profile picture.
 *
 * @returns the value of the Story row
 */
function StoryValue({ story }: { story: PictureToCheck['story'] }) {
  const { t } = useTranslation('moderation');
  if (story === null) return <>{t('pictures.noStory')}</>;
  return (
    <>
      <Link to={`/s/${story.slug}`} className="text-link underline">
        {story.title}
      </Link>{' '}
      ({t(`pictures.ratings.${story.rating}`)})
    </>
  );
}

/**
 * Renders the card.
 *
 * @returns one list item
 */
export function PictureToCheckCard(props: PictureToCheckCardProps) {
  const { t, i18n } = useTranslation('moderation');
  const { picture } = props;
  const headingId = `picture-${picture.caseId}-heading`;
  const waitingSince = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(picture.waitingSince));
  return (
    <li
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 id={headingId} className="m-0 font-heading text-lg font-bold text-heading">
        {t(`picture.kinds.${picture.kind}`, { defaultValue: picture.kind })} · @
        {picture.uploaderHandle}
      </h2>
      <LargePicture picture={picture} />
      <LabelRows
        rows={[
          { label: t('pictures.uploader'), value: `@${picture.uploaderHandle}` },
          { label: t('pictures.ageGroup'), value: t(`ageBands.${picture.uploaderAgeBand}`) },
          { label: t('picture.story'), value: <StoryValue story={picture.story} /> },
          { label: t('pictures.waitingSince'), value: waitingSince },
        ]}
      />
      <PictureDecisionButtons
        picture={picture}
        reasons={props.reasons}
        isDeciding={props.isDeciding}
        onDecide={props.onDecide}
      />
    </li>
  );
}
