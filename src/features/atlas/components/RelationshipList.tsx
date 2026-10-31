/**
 * RelationshipList: relationships written out as sentences, each with Delete (story S1-E17-14:
 * "it is listed on both [sheets], and I can delete it"; S1-E17-15: "the same relationships are
 * available as a list").
 *
 * Delete asks once more ("Delete “Ana is the parent of Vali”?") with Yes and Keep, and the focus
 * moves to the question so a screen reader hears it (Story Atlas principle: nothing is deleted
 * without a second, confirming click). The list's rows have a fine line between them (DoD: label
 * rows). Who uses it: CharacterRelationshipsSection and ConnectionsPage.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { CharacterRelationship } from '../api/characters';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the list needs. */
export interface RelationshipListProps {
  relationships: CharacterRelationship[];
  words: RelationshipWords;
  /** Deletes one relationship; throws when it can't. */
  onDelete: (relationshipId: string) => Promise<void>;
  /** Anything more under a relationship: "Keep private" on the Connections page (S1-E17-32). */
  extra?: (relationship: CharacterRelationship, sentence: string) => ReactNode;
}

/** One relationship's row: the sentence, the note, and Delete with its question. */
function RelationshipRow({
  relationship,
  words,
  onDelete,
  extra,
}: {
  relationship: CharacterRelationship;
  words: RelationshipWords;
  onDelete: RelationshipListProps['onDelete'];
  extra: RelationshipListProps['extra'];
}) {
  const { t } = useAtlasTranslation();
  const [isAsking, setIsAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  const question = useRef<HTMLParagraphElement>(null);
  const sentence = words.sentence(relationship);

  // The question takes the focus when it appears, so it is read out.
  useEffect(() => {
    if (isAsking) question.current?.focus();
  }, [isAsking]);

  /** The second click: deletes, or says plainly that it couldn't. */
  async function confirm() {
    setFailed(false);
    await onDelete(relationship.id).catch(() => setFailed(true));
  }

  return (
    <li className="flex flex-col gap-2 border-b border-hairline py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 break-words text-ink">{sentence}</span>
        {!isAsking && (
          <Button variant="secondary" onClick={() => setIsAsking(true)}>
            {t('connections.list.delete')}
            <span className="sr-only"> {sentence}</span>
          </Button>
        )}
      </div>
      {relationship.note !== '' && (
        <p className="m-0 text-sm break-words whitespace-pre-line text-body">{relationship.note}</p>
      )}
      {extra?.(relationship, sentence)}
      {isAsking && (
        <div className="flex flex-col gap-2">
          <p ref={question} tabIndex={-1} className="m-0 text-body">
            {t('connections.list.confirm', { sentence })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" onClick={() => void confirm()}>
              {t('connections.list.yes')}
            </Button>
            <Button variant="secondary" onClick={() => setIsAsking(false)}>
              {t('connections.list.keep')}
            </Button>
          </div>
        </div>
      )}
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
export function RelationshipList({ relationships, words, onDelete, extra }: RelationshipListProps) {
  const { t } = useAtlasTranslation();
  if (relationships.length === 0) {
    return <p className="m-0 text-body">{t('connections.list.none')}</p>;
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
        />
      ))}
    </ul>
  );
}
