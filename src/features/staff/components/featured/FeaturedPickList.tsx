/**
 * FeaturedPickList: the stories picked for Featured this week, in the band's order, with the
 * reason and Save (story S1-E5-10; criteria 3 and 7).
 *
 * Staff move a story up or down with buttons (no dragging, DoD accessibility) or take it out, then
 * say why and save. When no pick is rated All ages or 13+, a warning says younger readers and
 * signed-out visitors will see an empty band (a warning, not a block). Saving an empty list
 * empties the band, which Discover then hides.
 * Who shows it: FeaturedPage. What it calls: the actions from useFeaturedPicks.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import type { FeaturedCandidate, FeaturedFailure } from '../../api/featured';

/** What the list needs. */
export interface FeaturedPickListProps {
  picks: string[];
  /** Every current active story, to name the picks (from the "All ranked" view). */
  known: FeaturedCandidate[];
  featuredMax: number;
  onMove: (storyId: string, step: -1 | 1) => void;
  onRemove: (storyId: string) => void;
  onSave: (reason: string) => void;
  isSaving: boolean;
  saveFailure: FeaturedFailure | null;
  hasSaved: boolean;
}

/** The small round buttons beside each pick. */
const smallButton =
  'inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-control-border bg-surface text-heading hover:bg-tint disabled:opacity-40';

/**
 * One pick: its place, title and the move and remove buttons.
 *
 * @returns the list item
 */
function PickRow(props: {
  storyId: string;
  place: number;
  count: number;
  title: string;
  list: FeaturedPickListProps;
}) {
  const { t } = useTranslation('staff');
  const { storyId, place, count, title, list } = props;
  return (
    <li className="flex items-center gap-2 border-b border-hairline py-2">
      <span className="w-6 text-meta">{place}.</span>
      <span className="min-w-0 flex-1 font-semibold break-words text-heading">{title}</span>
      <button
        type="button"
        className={smallButton}
        disabled={place === 1}
        aria-label={t('featured.picks.moveUp', { title })}
        onClick={() => list.onMove(storyId, -1)}
      >
        <ArrowDownIcon className="rotate-180" />
      </button>
      <button
        type="button"
        className={smallButton}
        disabled={place === count}
        aria-label={t('featured.picks.moveDown', { title })}
        onClick={() => list.onMove(storyId, 1)}
      >
        <ArrowDownIcon />
      </button>
      <Button
        variant="text"
        onClick={() => list.onRemove(storyId)}
        aria-label={t('featured.picks.removeLabel', { title })}
      >
        {t('featured.picks.remove')}
      </Button>
    </li>
  );
}

/**
 * Whether any pick is rated All ages or 13+, so a visitor or a 13 to 15-year-old sees the band
 * (criterion 7).
 *
 * @param picked - the picked stories, undefined where a pick is no longer a current story
 * @returns true when at least one of them is
 */
function hasPickForYoungerReaders(picked: readonly ({ rating: string } | undefined)[]): boolean {
  return picked.some((story) => story?.rating === 'all_ages' || story?.rating === '13_plus');
}

/**
 * Renders the picks, the warning, the reason and Save.
 *
 * @returns the panel
 */
export function FeaturedPickList(props: FeaturedPickListProps) {
  const { t } = useTranslation('staff');
  const [reason, setReason] = useState('');
  const picked = props.picks.map((id) => props.known.find((story) => story.id === id));
  // Criterion 7: warn when no pick is one a 13 to 15-year-old or a visitor may see.
  const hasYoungerPick = hasPickForYoungerReaders(picked);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSave(reason);
  };
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 className="m-0 font-heading text-xl font-bold text-heading">
        {t('featured.picks.heading', { count: props.picks.length, max: props.featuredMax })}
      </h2>
      {props.picks.length === 0 ? (
        <p className="m-0 text-body">{t('featured.picks.empty')}</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {props.picks.map((storyId, index) => (
            <PickRow
              key={storyId}
              storyId={storyId}
              place={index + 1}
              count={props.picks.length}
              title={picked[index]?.title ?? t('featured.picks.notCurrent')}
              list={props}
            />
          ))}
        </ol>
      )}
      {props.picks.length > 0 && !hasYoungerPick && (
        <Notice tone="warning">{t('featured.picks.noYoungerPick')}</Notice>
      )}
      <Textarea
        id="featured-reason"
        label={t('featured.picks.reason')}
        hint={t('featured.picks.reasonHint')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={2}
        required
      />
      {props.saveFailure !== null && (
        <Notice tone="error">{t(`featured.failures.${props.saveFailure}`)}</Notice>
      )}
      {props.hasSaved && <Notice tone="success">{t('featured.picks.saved')}</Notice>}
      <Button
        type="submit"
        disabled={props.isSaving || reason.trim() === ''}
        className="self-start"
      >
        {t('featured.picks.save')}
      </Button>
    </form>
  );
}
