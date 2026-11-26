/**
 * SpaceLogWhoSelect: the "Who" drop-down above a space's moderation log: "Anyone", each person
 * who acted in the space, and our moderation team when it acted (bundle BOOKS-7, board F12).
 *
 * Our moderation team is one choice, "The moderation team", never a staff member's name.
 * Who uses it: SpaceLogPage. What it calls: the shared Select; the page then reads space_log()
 * again for the person picked.
 */
import { Select } from '@/components/ui/Select';
import type { ForumPerson } from '@/features/forums/api/forumThreads';
import { nameOf } from '@/features/forums/lib/forumPeople';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The drop-down's value for our moderation team (space_log()'s 'platform'). */
export const platformChoice = 'platform';

/** What the drop-down needs. */
export interface SpaceLogWhoSelectProps {
  /** The people who acted in the space (space_log()'s "people"). */
  people: ForumPerson[];
  /** Whether our moderation team acted, so it is offered too. */
  platformActed: boolean;
  /** The username picked, 'platform', or '' for anyone. */
  value: string;
  onChange: (who: string) => void;
}

/**
 * Renders the drop-down with its label beside it, as the board draws.
 *
 * @returns the drop-down
 */
export function SpaceLogWhoSelect({
  people,
  platformActed,
  value,
  onChange,
}: SpaceLogWhoSelectProps) {
  const { t } = useSpacesTranslation();
  // Anyone first, then each person by name, then our moderation team.
  const options = [{ value: '', label: t('log.anyone') }];
  for (const person of people) {
    if (person !== null) options.push({ value: person.handle, label: nameOf(person, '') });
  }
  if (platformActed) options.push({ value: platformChoice, label: t('log.team') });
  return (
    <Select
      id="space-log-who"
      label={t('log.who')}
      isLabelVisible
      options={options}
      value={value}
      onChange={onChange}
      placement="form"
    />
  );
}
