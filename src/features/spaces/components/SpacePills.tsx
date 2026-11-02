/**
 * SpacePills: who can read a space, which age group it takes and who can post, as information
 * pills (bundle FORUMS-2, part a; S1-E8-06; the board's header line and the forum index's space
 * rows).
 *
 * The age group is shown only to readers in that group: the database leaves it out for everyone
 * else (space_json(), a proposal in the pull request), so an adult never learns that a space
 * is for under-16s. A class space (bundle CLASSES, part a; S1-E8-11) starts with a "Class space"
 * pill and has no age group: it is for the people in the room.
 * Who shows it: SpaceHeaderCard and SpaceRow. What it calls: InfoPill.
 */
import { InfoPill } from '@/components/ui/InfoPill';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the pills.
 *
 * @param props.space - the space
 * @returns a list of two to four pills
 */
export function SpacePills({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const ageKey = space.ageGroup === 'under_16' ? 'pills.under16' : 'pills.sixteenPlus';
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {space.kind === 'class' && (
        <li>
          <InfoPill tone="sage">{t('pills.classSpace')}</InfoPill>
        </li>
      )}
      <li>
        <InfoPill tone="sky">
          {space.readers === 'everybody' ? t('pills.anyoneReads') : t('pills.membersRead')}
        </InfoPill>
      </li>
      {space.ageGroup !== null && (
        <li>
          <InfoPill tone="plum">{t(ageKey)}</InfoPill>
        </li>
      )}
      <li>
        <InfoPill tone="gold">
          {space.posting === 'members' ? t('pills.membersOnly') : t('pills.anyonePosts')}
        </InfoPill>
      </li>
    </ul>
  );
}
