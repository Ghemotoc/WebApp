/**
 * RelationshipOwnWords: the writer's own words for an "Other" relationship, both ways (bundle G10
 * ATLAS, part b; handoff A4: "Other: a text box, What is Ilinca to them? and an optional
 * reverse").
 *
 * The first box is needed ("godmother of"); the second is optional and is what the second
 * character's sheet shows ("goddaughter of"). Each takes at most 60 characters, as the database
 * does. Who uses it: AddRelationshipForm. What it calls: the change prop.
 */
import { TextInput } from '@/components/ui/TextInput';

import type { NewRelationship } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the two boxes need. */
export interface RelationshipOwnWordsProps {
  idPrefix: string;
  /** The two characters' names, or a plain stand-in while one isn't picked yet. */
  fromName: string;
  toName: string;
  customLabel: string;
  reverseLabel: string;
  change: (part: Partial<NewRelationship>) => void;
}

/**
 * Renders the two boxes.
 *
 * @returns the label box and the reverse label box
 */
export function RelationshipOwnWords({
  idPrefix,
  fromName,
  toName,
  customLabel,
  reverseLabel,
  change,
}: RelationshipOwnWordsProps) {
  const { t } = useAtlasTranslation();
  const names = { from: fromName, to: toName };
  return (
    <>
      <TextInput
        id={`${idPrefix}-label`}
        label={t('connections.add.customLabel', names)}
        hint={t('connections.add.customHint')}
        maxLength={60}
        value={customLabel}
        onChange={(event) => change({ customLabel: event.target.value })}
      />
      <TextInput
        id={`${idPrefix}-reverse`}
        label={t('connections.add.reverseLabel', names)}
        hint={t('connections.add.reverseHint', names)}
        maxLength={60}
        value={reverseLabel}
        onChange={(event) => change({ reverseLabel: event.target.value })}
      />
    </>
  );
}
