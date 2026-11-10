/**
 * HomeCommentSection: where an admin or the owner picks the reader comment for the home page's
 * cover wall (bundle GAPS-13; story S1-E5-13; board Website-Home, the comment card).
 *
 * Two lists: the picks, each with the reader's answer and whether it is on the home page, with
 * "Take down"; and recent comments that could be shown, each with "Invite". Inviting only asks
 * the reader: visitors see nothing until the reader agrees, and the newest agreement is the one
 * shown. Staff never change a comment's words here (CLAUDE.md rule 18).
 * Who shows it: FeaturedPage, under the Featured picks (the same "featured" area: owner and
 * admin; the database refuses everyone else). What it calls: useStaffHomeComments.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import type {
  HomeCommentAnswer,
  HomeCommentCandidate,
  StaffHomeCommentPick,
} from '@/features/website/api/homeComment';
import { HomeCommentWords } from '@/features/website/components/HomeCommentWords';
import { useStaffHomeComments } from '@/features/website/hooks/useStaffHomeComments';

/** The pill colour for each answer. */
const answerTones: Record<HomeCommentAnswer, PillTone> = {
  waiting: 'neutral',
  agreed: 'sage',
  declined: 'blush',
};

/** The words every row shows: who, the comment and where it was left. */
interface CommentWordsProps {
  displayName: string;
  handle: string;
  body: string;
  storyTitle: string;
  chapterPosition: number;
}

/**
 * Who wrote a comment, the comment and its story and chapter.
 *
 * @returns the three lines
 */
function CommentWords(props: CommentWordsProps) {
  const { t } = useTranslation('staff');
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="m-0 text-sm wrap-anywhere text-meta">
        <b className="text-heading">{props.displayName}</b> @{props.handle}
      </p>
      <HomeCommentWords text={props.body} className="m-0 wrap-anywhere text-body" />
      <p className="m-0 text-sm wrap-anywhere text-meta">
        {t('featured.homeComment.place', {
          story: props.storyTitle,
          position: props.chapterPosition,
        })}
      </p>
    </div>
  );
}

/**
 * One pick: the comment, the reader's answer, whether it is showing and "Take down".
 *
 * @returns the row
 */
function PickRow(props: { pick: StaffHomeCommentPick; isBusy: boolean; onRemove: () => void }) {
  const { t } = useTranslation('staff');
  const { pick } = props;
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-t border-border py-4">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
        <CommentWords {...pick} />
        <div className="flex flex-wrap gap-2">
          <InfoPill tone={answerTones[pick.answer]}>
            {t(`featured.homeComment.answers.${pick.answer}`)}
          </InfoPill>
          {pick.isOnHomePage && (
            <InfoPill tone="plum">{t('featured.homeComment.onHomePage')}</InfoPill>
          )}
          {!pick.canShow && <InfoPill tone="gold">{t('featured.homeComment.cannotShow')}</InfoPill>}
        </div>
      </div>
      <Button
        variant="secondary"
        disabled={props.isBusy}
        onClick={props.onRemove}
        aria-label={t('featured.homeComment.removeLabel', { name: pick.displayName })}
      >
        {t('featured.homeComment.remove')}
      </Button>
    </li>
  );
}

/**
 * One comment that could be invited, with "Invite".
 *
 * @returns the row
 */
function CandidateRow(props: {
  candidate: HomeCommentCandidate;
  isBusy: boolean;
  onInvite: () => void;
}) {
  const { t } = useTranslation('staff');
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-t border-border py-4">
      <div className="min-w-0 flex-[1_1_320px]">
        <CommentWords {...props.candidate} />
      </div>
      <Button
        variant="secondary"
        disabled={props.isBusy}
        onClick={props.onInvite}
        aria-label={t('featured.homeComment.inviteLabel', { name: props.candidate.displayName })}
      >
        {t('featured.homeComment.invite')}
      </Button>
    </li>
  );
}

/** useStaffHomeComments's result, passed down once. */
type HomeCommentState = ReturnType<typeof useStaffHomeComments>;

/**
 * The two lists once they are read.
 *
 * @returns the picks and the candidates, each under its heading, or a loading line
 */
function HomeCommentLists({ state }: { state: HomeCommentState }) {
  const { t } = useTranslation('staff');
  if (state.picks === null || state.candidates === null) {
    return <p className="m-0 text-body">{t('featured.homeComment.loading')}</p>;
  }
  return (
    <>
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('featured.homeComment.picksHeading')}
      </h3>
      {state.picks.length === 0 ? (
        <p className="m-0 text-body">{t('featured.homeComment.noPicks')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {state.picks.map((pick) => (
            <PickRow
              key={pick.id}
              pick={pick}
              isBusy={state.isChanging}
              onRemove={() => state.remove(pick.id)}
            />
          ))}
        </ul>
      )}
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('featured.homeComment.candidatesHeading')}
      </h3>
      {state.candidates.length === 0 ? (
        <p className="m-0 text-body">{t('featured.homeComment.noCandidates')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {state.candidates.map((candidate) => (
            <CandidateRow
              key={candidate.commentId}
              candidate={candidate}
              isBusy={state.isChanging}
              onInvite={() => state.invite(candidate.commentId)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Renders the section.
 *
 * @returns the section, or nothing for staff the database refuses (the page above already
 *   says who can pick)
 */
export function HomeCommentSection() {
  const { t } = useTranslation('staff');
  const state = useStaffHomeComments();
  if (state.loadFailure === 'not_allowed') return null;
  return (
    <section aria-labelledby="featured-home-comment" className="flex max-w-[820px] flex-col gap-4">
      <h2 id="featured-home-comment" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('featured.homeComment.heading')}
      </h2>
      <p className="m-0 text-body">{t('featured.homeComment.intro')}</p>
      <div aria-live="polite">
        {state.changeFailure !== null && (
          <Notice tone="error">{t(`featured.homeComment.failures.${state.changeFailure}`)}</Notice>
        )}
      </div>
      {state.loadFailure !== null ? (
        <Notice tone="error">{t('featured.homeComment.failures.failed')}</Notice>
      ) : (
        <HomeCommentLists state={state} />
      )}
    </section>
  );
}
