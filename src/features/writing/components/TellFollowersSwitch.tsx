/**
 * TellFollowersSwitch: "Tell followers" in the Publish dialog (board D06, user story 5.6).
 *
 * The shared Switch with its label on the left and the hint under it: "1,284 followers get a
 * notification when it goes out." The hint is the switch's description (aria-describedby), so a
 * screen reader hears the number after the name. On by default; off, the chapter goes out without
 * a notification (publish_chapter() and schedule_chapter() keep the choice).
 * Who uses it: PublishPanel (a draft). What it calls: Switch; the panel keeps the choice.
 */
import { useId } from 'react';

import { Switch } from '@/components/ui/Switch';

import { useEditorTranslation } from '../registerEditorTranslations';

/** What the switch needs. */
export interface TellFollowersSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  /** How many people hear (chapter_followers_to_tell()); null while it loads. */
  followerCount: number | null;
}

/**
 * The line under the switch, in the reader's language and number format.
 *
 * @returns the hint, or an empty string while the number loads
 */
function useFollowersHint(followerCount: number | null): string {
  const { t, i18n } = useEditorTranslation();
  if (followerCount === null) return '';
  if (followerCount === 0) return t('publish.tellHintNone');
  // "1,284" in English, "1.284" in Romanian; the plural follows the number itself.
  const formatted = new Intl.NumberFormat(i18n.language).format(followerCount);
  return t('publish.tellHint', { count: followerCount, formatted });
}

/**
 * Renders the switch and its hint.
 *
 * @returns the row
 */
export function TellFollowersSwitch({ isOn, onToggle, followerCount }: TellFollowersSwitchProps) {
  const { t } = useEditorTranslation();
  const hintId = useId();
  const hint = useFollowersHint(followerCount);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        {/* The visible label; the switch carries the same words as its accessible name. */}
        <span aria-hidden="true" className="type-body text-ink">
          {t('publish.tellSwitch')}
        </span>
        <Switch
          label={t('publish.tellSwitch')}
          isOn={isOn}
          onToggle={onToggle}
          describedBy={hintId}
        />
      </div>
      <p id={hintId} className="m-0 type-meta leading-normal text-ink-muted">
        {hint}
      </p>
    </div>
  );
}
