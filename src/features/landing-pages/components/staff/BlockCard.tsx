/**
 * BlockCard: one block in the landing page editor, with Up, Down and Remove, its Romanian and
 * English fields side by side and the fields both languages share (story S1-E11-14 criteria 3
 * and 4; bundle CONTESTS-13a1).
 *
 * Moving uses buttons, never dragging, so every change works from the keyboard. The hero is fixed
 * at the top, so its card has no Up, Down or Remove; the page always keeps one h1.
 * Who shows it: LandingEditorForm, once for each block. What it calls: BlockLanguageColumn,
 * QuestionItemsFields and BlockSharedFields.
 */
import { Button } from '@/components/ui/Button';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import { landingLanguages, type LandingBlock, type LandingContent } from '@/schemas/landingPages';

import { canMove } from '../../lib/blocks';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

import { BlockLanguageColumn } from './BlockLanguageColumn';
import { BlockSharedFields } from './BlockSharedFields';
import { QuestionItemsFields } from './QuestionItemsFields';

/** What the card needs. */
interface BlockCardProps {
  content: LandingContent;
  index: number;
  problems: readonly FieldProblem[];
  onChange: (block: LandingBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

/**
 * The card's heading and its Up, Down and Remove buttons.
 *
 * @returns the header row
 */
function BlockCardHeader({ content, index, onMove, onRemove }: BlockCardProps) {
  const { t } = useLandingPageTranslation();
  const block = content.blocks[index];
  const name = t('editor.blockName', {
    number: index + 1,
    kind: t(`kinds.${block?.kind ?? 'text'}`),
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="m-0 font-heading text-lg font-bold text-heading">{name}</h3>
      {block?.kind !== 'hero' && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={!canMove(content, index, -1)}
            aria-label={t('editor.moveUp', { block: name })}
            onClick={() => onMove(-1)}
          >
            {t('editor.up')}
          </Button>
          <Button
            variant="secondary"
            disabled={!canMove(content, index, 1)}
            aria-label={t('editor.moveDown', { block: name })}
            onClick={() => onMove(1)}
          >
            {t('editor.down')}
          </Button>
          <Button
            variant="destructive"
            aria-label={t('editor.removeBlock', { block: name })}
            onClick={onRemove}
          >
            {t('editor.remove')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the card.
 *
 * @returns a section for the block
 */
export function BlockCard(props: BlockCardProps) {
  const { t } = useLandingPageTranslation();
  const { content, index, problems, onChange } = props;
  const block = content.blocks[index];
  if (block === undefined) return null;
  const blockProblem = problemFor(problems, `blocks.${index}`);
  return (
    <li className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <BlockCardHeader {...props} />
      {blockProblem !== null && (
        <p className="m-0 text-sm text-destructive">{t(`editor.problems.${blockProblem}`)}</p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {landingLanguages.map((language) => (
          <BlockLanguageColumn
            key={language}
            block={block}
            index={index}
            language={language}
            problems={problems}
            onChange={onChange}
          />
        ))}
      </div>
      {block.kind === 'questions' && (
        <QuestionItemsFields block={block} index={index} problems={problems} onChange={onChange} />
      )}
      <BlockSharedFields block={block} index={index} problems={problems} onChange={onChange} />
    </li>
  );
}
