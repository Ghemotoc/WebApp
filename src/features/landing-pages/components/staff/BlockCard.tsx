/**
 * BlockCard: the editor panel for the one open block of a landing page: "Editing block 2 of 5",
 * its Romanian and English fields side by side, the fields both languages share and "Next block"
 * (story S1-E11-14 criteria 3 and 4; bundle CONTESTS-13a1; one block at a time beside the list
 * since bundle G12c, the canvas's StaffWebsiteLandingEdit board).
 *
 * Moving and removing blocks happen in the list (BlockListRow), so this panel only edits.
 * Who shows it: LandingEditorForm, for the open block. What it calls: BlockLanguageColumn,
 * BlockPictureField, QuestionItemsFields and BlockSharedFields.
 */
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import type { PictureView } from '@/features/pictures/api/pictures';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import {
  landingLanguages,
  landingPictureKinds,
  type LandingBlock,
  type LandingContent,
} from '@/schemas/landingPages';

import { isEntryKind } from '../../lib/entries';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

import { BlockLanguageColumn } from './BlockLanguageColumn';
import { BlockPictureField } from './BlockPictureField';
import { BlockSharedFields } from './BlockSharedFields';
import { EntryItemsFields } from './EntryItemsFields';
import { QuestionItemsFields } from './QuestionItemsFields';

/** What the card needs. */
interface BlockCardProps {
  pageId: string;
  /** The panel's id, which the list's Edit buttons point at. */
  editorId: string;
  /** The page's uploaded pictures and their check states (part a2a). */
  pictures: Record<string, PictureView>;
  content: LandingContent;
  index: number;
  problems: readonly FieldProblem[];
  onChange: (block: LandingBlock) => void;
  /** Opens the block after this one. */
  onNext: () => void;
}

/**
 * The panel's heading: "Editing block 2 of 5", the block's kind and the way to the next block.
 *
 * @returns the header row
 */
function BlockCardHeader({ content, index, onNext }: BlockCardProps) {
  const { t } = useLandingPageTranslation();
  const block = content.blocks[index];
  const next = content.blocks[index + 1];
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <Eyebrow>
          {t('editor.editingBlock', { number: index + 1, total: content.blocks.length })}
        </Eyebrow>
        <h3
          id={`landing-editor-b${String(index)}-heading`}
          className="m-0 font-heading text-xl font-bold text-heading"
        >
          {t(`kinds.${block?.kind ?? 'text'}`)}
        </h3>
      </div>
      {next !== undefined && (
        <Button variant="secondary" onClick={onNext}>
          {t('editor.nextBlock', { kind: t(`kinds.${next.kind}`) })}
        </Button>
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
    <section
      id={props.editorId}
      aria-labelledby={`landing-editor-b${String(index)}-heading`}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
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
      {landingPictureKinds.includes(block.kind) && (
        <BlockPictureField
          pageId={props.pageId}
          block={block}
          index={index}
          pictures={props.pictures}
          problems={problems}
          onChange={onChange}
        />
      )}
      {block.kind === 'questions' && (
        <QuestionItemsFields block={block} index={index} problems={problems} onChange={onChange} />
      )}
      {isEntryKind(block.kind) && (
        <EntryItemsFields
          block={block}
          kind={block.kind}
          index={index}
          problems={problems}
          onChange={onChange}
        />
      )}
      <BlockSharedFields block={block} index={index} problems={problems} onChange={onChange} />
    </section>
  );
}
