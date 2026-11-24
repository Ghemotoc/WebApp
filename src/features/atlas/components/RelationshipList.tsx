/**
 * RelationshipList: relationships written out as sentences, each with Delete (story S1-E17-14:
 * "it is listed on both [sheets], and I can delete it"; S1-E17-15: "the same relationships are
 * available as a list").
 *
 * Delete deletes at once and the shared undo note offers "Undo" for 8 seconds, which puts the
 * relationship back exactly as it was (design books item 14: Undo instead of asking; it replaces
 * the Story Atlas principle of a second, confirming click). The list's rows have a fine line between them (DoD: label
 * rows). On the Connections page each sentence starts with its category's colour dot (CALM-9,
 * board E25: the colour shows "on the list labels").
 * Who uses it: CharacterRelationshipsSection and ConnectionsPage. What it calls: onDelete (from
 * useRelationshipChangers) and useUndo.
 */
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useUndo } from '@/lib/undo/useUndo';

import type { CharacterRelationship } from '../api/characters';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { categoryOf, type RelationshipColours } from '../lib/relationshipCategories';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CategoryDot } from './CategoryDot';

/** What the list needs. */
export interface RelationshipListProps {
  relationships: CharacterRelationship[];
  words: RelationshipWords;
  /** Deletes one relationship and returns how to put it back; throws when it can't. */
  onDelete: (relationshipId: string) => Promise<() => Promise<void>>;
  /** Anything more under a relationship: "Keep private" on the Connections page (S1-E17-32). */
  extra?: (relationship: CharacterRelationship, sentence: string) => ReactNode;
  /** The sheet's character, so an "Other" relationship reads from their side (G10b). */
  viewpointId?: string;
  /** The writer's category colours: when given, each sentence starts with its colour dot. */
  colours?: RelationshipColours;
}

/** What one row needs: the list's props, for one relationship. */
interface RelationshipRowProps extends Omit<RelationshipListProps, 'relationships'> {
  relationship: CharacterRelationship;
}

/** The sentence, after its category's colour dot when the colours are given. */
function RowSentence({
  relationship,
  sentence,
  colours,
}: {
  relationship: CharacterRelationship;
  sentence: string;
  colours: RelationshipColours | undefined;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 break-words text-ink">
      {colours !== undefined && (
        <CategoryDot category={categoryOf(relationship.kind)} colours={colours} />
      )}
      {sentence}
    </span>
  );
}

/** One relationship's row: the sentence, the note, and Delete. */
function RelationshipRow({
  relationship,
  words,
  onDelete,
  extra,
  viewpointId,
  colours,
}: RelationshipRowProps) {
  const { t } = useAtlasTranslation();
  const { offerUndo } = useUndo();
  const [failed, setFailed] = useState(false);
  const sentence = words.sentence(relationship, viewpointId);

  /** Deletes at once, then offers Undo; or says plainly that it couldn't. */
  async function remove() {
    setFailed(false);
    let putBack: () => Promise<void>;
    try {
      putBack = await onDelete(relationship.id);
    } catch {
      setFailed(true);
      return;
    }
    offerUndo({ message: t('connections.list.deletedUndo', { sentence }), undo: putBack });
  }

  return (
    <li className="flex flex-col gap-2 border-b border-hairline py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RowSentence relationship={relationship} sentence={sentence} colours={colours} />
        <Button variant="secondary" onClick={() => void remove()}>
          {t('connections.list.delete')}
          <span className="sr-only"> {sentence}</span>
        </Button>
      </div>
      {relationship.note !== '' && (
        <p className="m-0 type-body break-words whitespace-pre-line text-ink-muted">
          {relationship.note}
        </p>
      )}
      {extra?.(relationship, sentence)}
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('connections.list.failed')}</Notice>}
      </div>
    </li>
  );
}

/**
 * Renders the list, or a plain line when there is nothing in it.
 *
 * @returns the list of relationships
 */
export function RelationshipList({
  relationships,
  words,
  onDelete,
  extra,
  viewpointId,
  colours,
}: RelationshipListProps) {
  const { t } = useAtlasTranslation();
  if (relationships.length === 0) {
    return <p className="m-0 text-ink-muted">{t('connections.list.none')}</p>;
  }
  return (
    <ul className="m-0 list-none p-0">
      {relationships.map((relationship) => (
        <RelationshipRow
          key={relationship.id}
          relationship={relationship}
          words={words}
          onDelete={onDelete}
          extra={extra}
          viewpointId={viewpointId}
          colours={colours}
        />
      ))}
    </ul>
  );
}
