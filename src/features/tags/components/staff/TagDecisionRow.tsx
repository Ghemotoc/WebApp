/**
 * TagDecisionRow: one tag in the staff queue: how many stories use it, its name in each interface
 * language, and Approve (or Save the names) and Reject (CMS-1e; Robert, 30 Oct 2026: "Staff
 * approve, rename or reject").
 *
 * A waiting tag starts with the writer's spelling in every language, for staff to translate. When
 * the database refuses the names, each field says why ("ro:taken").
 * Who shows it: TagsAdminPage. What it calls: the queue's decide().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { QueuedTag, TagQueueView } from '../../api/tagStore';
import type { TagQueue } from '../../hooks/useTagQueue';

import { RejectTagForm } from './RejectTagForm';

/** What a row needs. */
interface TagDecisionRowProps {
  tag: QueuedTag;
  view: TagQueueView;
  queue: TagQueue;
}

/**
 * The interface languages a tag needs a name in: the ones it has and the ones it lacks.
 *
 * @param tag - the tag
 * @returns language codes, Romanian first
 */
function languagesOf(tag: QueuedTag): string[] {
  const codes = [...new Set([...Object.keys(tag.names), ...tag.missingLanguages])].sort();
  // Romanian is the first market's language, so its field comes first.
  const others = codes.filter((code) => code !== 'ro');
  return codes.includes('ro') ? ['ro', ...others] : others;
}

/**
 * The names to start from: the ones it has, and the writer's spelling for the rest.
 *
 * @param tag - the tag
 * @returns a name per language
 */
function startingNames(tag: QueuedTag): Record<string, string> {
  return Object.fromEntries(
    languagesOf(tag).map((code) => [code, tag.names[code] ?? tag.storedName]),
  );
}

/**
 * Renders the row.
 *
 * @returns the list item with its form
 */
export function TagDecisionRow({ tag, view, queue }: TagDecisionRowProps) {
  const { t } = useTranslation('tagsAdmin');
  const [names, setNames] = useState(() => startingNames(tag));
  const [isRejecting, setIsRejecting] = useState(false);
  // The database's problems for this row only: "ro:taken" → {ro: "taken"}.
  const problems = queue.failure?.tagId === tag.id ? queue.failure.error.problems : [];
  const problemOf = (field: string) => problems.find((problem) => problem.field === field)?.problem;
  const reasonProblem = problemOf('reason') ?? null;
  return (
    <li className="flex flex-col gap-4 border-b border-hairline py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="m-0 font-heading text-xl font-bold text-heading">{tag.storedName}</h2>
        <span className="text-sm text-meta">{t('storyCount', { count: tag.storyCount })}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {languagesOf(tag).map((code) => {
          const problem = problemOf(code);
          return (
            <TextInput
              key={code}
              id={`tag-${tag.id}-${code}`}
              label={t('nameIn', { language: t(`languages.${code}`, { defaultValue: code }) })}
              lang={code}
              value={names[code] ?? ''}
              maxLength={40}
              errorMessage={problem === undefined ? undefined : t(`problems.${problem}`)}
              onChange={(event) => setNames({ ...names, [code]: event.target.value })}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          aria-label={view === 'waiting' ? t('approveLabel', { name: tag.storedName }) : undefined}
          disabled={queue.isBusy}
          onClick={() => void queue.decide({ kind: 'name', tagId: tag.id, names })}
        >
          {view === 'waiting' ? t('approve') : t('saveNames')}
        </Button>
        {view === 'waiting' && !isRejecting && (
          <Button
            variant="destructive"
            aria-label={t('rejectLabel', { name: tag.storedName })}
            onClick={() => setIsRejecting(true)}
          >
            {t('reject')}
          </Button>
        )}
      </div>
      {isRejecting && (
        <RejectTagForm
          tagId={tag.id}
          reasonProblem={reasonProblem}
          isBusy={queue.isBusy}
          onReject={(reason) => void queue.decide({ kind: 'reject', tagId: tag.id, reason })}
          onCancel={() => setIsRejecting(false)}
        />
      )}
    </li>
  );
}
