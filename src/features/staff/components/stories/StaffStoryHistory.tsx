/**
 * StaffStoryHistory: a story's version history in the admin site (bundle ADMIN-2, part b2; story
 * S1-E11-08 criteria 1, "a new version is stored" and "Restore"; board AdminStory 8.11).
 *
 * Every staff change, newest first: when, who on the staff, what changed (before and after), the
 * reason, and for a restore which change it undid. A removed passage shows only how many
 * characters went; its words open from "Show the removed words", and that read is logged. Staff
 * who may change stories also get Restore on each version; support staff only look.
 * Who shows it: StaffStoryPage. What it reads: the history inside useStaffStory's overview; the
 * changer from useChangeStaffStory, or null for staff who only look.
 */
import { useTranslation } from 'react-i18next';

import type { StaffStoryVersion } from '../../api/staffStoryHistory';
import type { StaffStoryChanger } from '../../hooks/useChangeStaffStory';
import { useStaffStoryWords } from '../../hooks/useStaffStoryWords';
import { canRestoreVersion, storyVersionText } from '../../lib/storyVersionText';

import { RemovedPassageReveal } from './RemovedPassageReveal';
import { VersionRestoreForm } from './VersionRestoreForm';

/** What the section needs. */
export interface StaffStoryHistoryProps {
  history: StaffStoryVersion[];
  changer: StaffStoryChanger | null;
}

/**
 * One version.
 *
 * @returns the list item
 */
function StoryVersionItem({
  version,
  history,
  changer,
}: {
  version: StaffStoryVersion;
  history: StaffStoryVersion[];
  changer: StaffStoryChanger | null;
}) {
  const { t } = useTranslation('staff');
  const words = useStaffStoryWords();
  const text = storyVersionText(t, words, version);
  const who =
    version.changedByHandle === null
      ? t('stories.history.unknownStaff')
      : `@${version.changedByHandle}`;
  const undone = history.find((earlier) => earlier.id === version.restoresVersionId);
  const showsPassage = changer !== null && version.kind === 'passage' && version.passageKept;
  return (
    <li className="flex flex-col gap-1.5 border-b border-border py-3">
      <p className="m-0 text-sm text-meta">
        {t('stories.history.meta', { date: words.date(version.at), who })}
      </p>
      <p className="m-0 font-semibold text-heading">{text.heading}</p>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {text.lines.map((line) => (
          <li key={line} className="text-body">
            {line}
          </li>
        ))}
      </ul>
      <p className="m-0 text-body">
        {t('stories.history.reason', {
          reason: t(`stories.change.reasons.${version.reasonCode}`, {
            defaultValue: version.reasonCode,
          }),
          text: version.reasonText,
        })}
      </p>
      {undone !== undefined && (
        <p className="m-0 text-sm text-meta">
          {t('stories.history.restores', { date: words.date(undone.at) })}
        </p>
      )}
      {showsPassage && <RemovedPassageReveal versionId={version.id} />}
      {changer !== null && canRestoreVersion(version) && (
        <VersionRestoreForm versionId={version.id} changer={changer} />
      )}
    </li>
  );
}

/**
 * Renders the history.
 *
 * @returns the section
 */
export function StaffStoryHistory({ history, changer }: StaffStoryHistoryProps) {
  const { t } = useTranslation('staff');
  return (
    <section aria-labelledby="story-history-heading" className="flex flex-col gap-2">
      <h2
        id="story-history-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('stories.history.heading')}
      </h2>
      <p className="m-0 text-body">{t('stories.history.intro')}</p>
      {history.length === 0 ? (
        <p className="m-0 text-body">{t('stories.history.empty')}</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {history.map((version) => (
            <StoryVersionItem
              key={version.id}
              version={version}
              history={history}
              changer={changer}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
