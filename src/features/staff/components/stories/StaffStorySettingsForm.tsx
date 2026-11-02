/**
 * StaffStorySettingsForm: "Settings and details": staff fix a story's settings with a reason
 * (bundle ADMIN-2, part b1; story S1-E11-08 criteria 2 to 4; board AdminStory 8.11).
 *
 * Only the fields staff changed are sent. A raised rating restricts who can read the story, so the
 * writer gets a statement of reasons (DSA art. 17); any other change (a corrected category or tag,
 * comments switched) gets a notification saying what changed and why. The database checks the
 * same rules as when the writer saves (abuse needs 16+ and the writer's content note; at most
 * 10 tags), so staff can't save a story the writer couldn't.
 * Who shows it: StaffStoryPage, for staff who may change stories. What it calls: the changer from
 * useChangeStaffStory.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { StaffStoryOverview } from '../../api/staffStories';
import type { StaffStoryChanger } from '../../hooks/useChangeStaffStory';
import {
  completeReason,
  emptyReason,
  settingsChange,
  tagNamesFrom,
} from '../../lib/staffStorySettingsDiff';

import { StaffStorySettingsFields } from './StaffStorySettingsFields';
import { StoryChangeFeedback } from './StoryChangeFeedback';
import { StoryChangeReasonFields } from './StoryChangeReasonFields';

/** What the form needs. */
export interface StaffStorySettingsFormProps {
  story: StaffStoryOverview;
  changer: StaffStoryChanger;
}

/**
 * Renders the section.
 *
 * @returns the fields, the reason and Save
 */
export function StaffStorySettingsForm({ story, changer }: StaffStorySettingsFormProps) {
  const { t } = useTranslation('staff');
  const [settings, setSettings] = useState(story.settings);
  const [typedTags, setTypedTags] = useState(story.settings.tagNames.join(', '));
  const [reason, setReason] = useState(emptyReason);
  const [problem, setProblem] = useState<string | null>(null);
  const change = settingsChange(story.settings, { ...settings, tagNames: tagNamesFrom(typedTags) });
  const hasChange = Object.keys(change).length > 0;

  /** Needs a change and a complete reason, then asks the database. */
  async function save(event: FormEvent) {
    event.preventDefault();
    const complete = completeReason(reason);
    if (complete === null) return setProblem(t('stories.change.reasonMissing'));
    setProblem(null);
    await changer
      .change({ kind: 'settings', change, reason: complete })
      .then(() => setReason(emptyReason))
      .catch(() => undefined);
  }

  return (
    <section aria-labelledby="story-settings-heading" className="flex flex-col gap-3">
      <h2
        id="story-settings-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('stories.change.settingsHeading')}
      </h2>
      <p className="m-0 text-body">{t('stories.change.settingsIntro')}</p>
      <form noValidate onSubmit={(event) => void save(event)} className="flex flex-col gap-4">
        <StaffStorySettingsFields
          settings={settings}
          onChange={setSettings}
          typedTags={typedTags}
          onTypedTagsChange={setTypedTags}
        />
        <StoryChangeReasonFields
          idPrefix="story-settings"
          reason={reason}
          onChange={setReason}
          problem={problem}
        />
        <div>
          <Button type="submit" disabled={changer.isBusy || !hasChange}>
            {t('stories.change.saveSettings')}
          </Button>
        </div>
        <StoryChangeFeedback changer={changer} isMine={(last) => last.kind === 'settings'} />
      </form>
    </section>
  );
}
