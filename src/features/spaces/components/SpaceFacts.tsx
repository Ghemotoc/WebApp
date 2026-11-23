/**
 * SpaceFacts: who can read a space, which age group it takes and who can post, as one meta line
 * (bundle FORUMS-2, part a; S1-E8-06; since CALM-9b, board simplified F06 and F08: "Anyone can
 * read · members 16 and over · members-only posting"). Before CALM-9b these were pills
 * (SpacePills).
 *
 * The age group is shown only to readers in that group: the database leaves it out for everyone
 * else (space_json(), a proposal in the pull request), so an adult never learns that a space
 * is for under-16s. A class space (bundle CLASSES, part a; S1-E8-11) starts with "Class space"
 * in bold and has no age group: it is for the people in the room. A locked class (part b) has
 * "Locked" in bold after it. A caller can put its own facts first (the member count on a row).
 * Who shows it: SpaceHeaderCard. What it calls: MetaLine.
 */
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Lists the space's facts in reading order: its states first, then who reads, the age group and
 * who posts.
 *
 * @param space - the space
 * @param t - the spaces translator
 * @returns the facts
 */
function spaceFacts(space: Space, t: ReturnType<typeof useSpacesTranslation>['t']): MetaFact[] {
  const facts: MetaFact[] = [];
  // Step 1: the states go first and in bold (CALM-2, MetaLine).
  if (space.kind === 'class') facts.push({ text: t('pills.classSpace'), kind: 'state' });
  if (space.isLocked) facts.push({ text: t('pills.locked'), kind: 'state' });
  // Step 2: who can read.
  facts.push({
    text: space.readers === 'everybody' ? t('pills.anyoneReads') : t('pills.membersRead'),
  });
  // Step 3: the age group, only when the database sent it (the reader is in that group).
  if (space.ageGroup !== null) {
    const ageKey = space.ageGroup === 'under_16' ? 'pills.under16' : 'pills.sixteenPlus';
    facts.push({ text: t(ageKey) });
  }
  // Step 4: who can post.
  facts.push({
    text: space.posting === 'members' ? t('pills.membersOnly') : t('pills.anyonePosts'),
  });
  return facts;
}

/**
 * Renders the line.
 *
 * @param props.space - the space
 * @param props.before - facts to show first, such as "214 members · run by inkwolf"
 * @returns a meta line of three to six facts
 */
export function SpaceFacts({ space, before = [] }: { space: Space; before?: MetaFact[] }) {
  const { t } = useSpacesTranslation();
  return <MetaLine facts={[...before, ...spaceFacts(space, t)]} />;
}
