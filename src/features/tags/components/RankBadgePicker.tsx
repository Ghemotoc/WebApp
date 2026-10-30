/**
 * RankBadgePicker: the writer picks which tags the rank badges on their cover show, in Story
 * settings (CMS-1g; Robert, 30 Oct 2026: "Show top 3 … but also let the writer pick because maybe
 * they want to stir the conversation in a different direction").
 *
 * One chip per approved tag on the story, with its current rank ("Fantasy · #4 of 38"). Switching
 * a chip saves at once, apart from the form's Save button, because the pick is about tags already
 * saved; "Show my 3 best ranks instead" goes back to automatic. At most 3 are picked: the other
 * chips are switched off until one is taken off, and the reason is written under them.
 * Who shows it: StorySettingsPage, after "Category and tags". What it calls: useTagRanks(),
 * useSaveRankBadgePick() and useTagCatalogue() (tag names in the interface language).
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';
import { FormSection } from '@/features/writing/components/FormSection';

import type { TagRank } from '../api/tagRanks';
import { useTagCatalogue } from '../hooks/useTagCatalogue';
import { useSaveRankBadgePick, useTagRanks } from '../hooks/useTagRanks';
import { MAXIMUM_RANK_BADGES, pickedTags, togglePick } from '../lib/rankPick';

/** The line under the chips: what the cover shows now, or why no more can be picked. */
function PickStatus({ picked }: { picked: string[] }) {
  const { t } = useTranslation('writing');
  if (picked.length === 0)
    return <p className="m-0 text-sm text-body">{t('rankBadges.automatic')}</p>;
  return (
    <p className="m-0 text-sm text-body">
      {t('rankBadges.picked', { count: picked.length })}
      {picked.length >= MAXIMUM_RANK_BADGES && <> {t('rankBadges.full')}</>}
    </p>
  );
}

/** The outcome of the last save. */
function SaveNotice({ save }: { save: ReturnType<typeof useSaveRankBadgePick> }) {
  const { t } = useTranslation('writing');
  if (save.isError) return <Notice tone="error">{t('rankBadges.saveFailed')}</Notice>;
  if (save.data === 'not_active') return <Notice tone="warning">{t('newStory.notActive')}</Notice>;
  if (save.data === 'ok') return <Notice tone="success">{t('rankBadges.saved')}</Notice>;
  return null;
}

/** One chip per tag, with its rank. */
function RankChips({
  ranks,
  picked,
  isSaving,
  onPick,
}: {
  ranks: TagRank[];
  picked: string[];
  isSaving: boolean;
  onPick: (next: string[]) => void;
}) {
  const { t } = useTranslation('writing');
  const { showTag } = useTagCatalogue();
  const isFull = picked.length >= MAXIMUM_RANK_BADGES;
  return (
    <ul aria-label={t('rankBadges.pickLabel')} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {ranks.map((entry) => {
        const tag = showTag(entry.tagName);
        const label =
          entry.rank === null
            ? t('rankBadges.noRank', { tag })
            : t('rankBadges.rankOf', { tag, rank: entry.rank, count: entry.outOf ?? 0 });
        // A chip can't be switched on past 3, and none can change while a save is on its way.
        const isLocked = isSaving || (isFull && !entry.isPicked);
        return (
          <li key={entry.tagName}>
            <Chip
              isPressed={entry.isPicked}
              isDisabled={isLocked}
              onPressedChange={(isOn) => onPick(togglePick(picked, entry.tagName, isOn))}
            >
              {label}
            </Chip>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Renders the section.
 *
 * @param props.slug - the writer's story
 * @returns the section card
 */
export function RankBadgePicker({ slug }: { slug: string }) {
  const { t } = useTranslation('writing');
  const ranks = useTagRanks(slug);
  const save = useSaveRankBadgePick(slug);
  const entries = ranks.data ?? [];
  const picked = pickedTags(entries);
  return (
    <FormSection legend={t('rankBadges.legend')}>
      <p className="m-0 max-w-[640px] text-sm leading-normal text-body">{t('rankBadges.intro')}</p>
      {ranks.isSuccess && entries.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('rankBadges.noTags')}</p>
      )}
      {entries.length > 0 && (
        <>
          <RankChips
            ranks={entries}
            picked={picked}
            isSaving={save.isPending}
            onPick={(next) => save.mutate(next)}
          />
          <PickStatus picked={picked} />
          {picked.length > 0 && (
            <div>
              <Button
                variant="secondary"
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate([])}
              >
                {t('rankBadges.useBest')}
              </Button>
            </div>
          )}
        </>
      )}
      <SaveNotice save={save} />
    </FormSection>
  );
}
