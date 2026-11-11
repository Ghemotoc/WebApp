/**
 * AddBlockRow: "Add a block" with a drop-down of the block kinds (story S1-E11-14 criterion 2;
 * bundle CONTESTS-13a1), grouped into families with one line on what the chosen block is for
 * (story S1-E11-34 criterion 1; bundle CMS-2b).
 *
 * The hero is offered only while the page has none, because a page has one hero, at the top. A
 * page holds at most landingMostBlocks blocks; the button says so when it is full.
 * Who shows it: LandingEditorForm, under the blocks. What it calls: newBlock() in lib/blocks.ts.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  landingBlockFamilies,
  landingBlockKinds,
  landingMostBlocks,
  type LandingBlock,
  type LandingBlockKind,
  type LandingContent,
} from '@/schemas/landingPages';

import { newBlock } from '../../lib/blocks';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the row needs. */
interface AddBlockRowProps {
  content: LandingContent;
  onAdd: (block: LandingBlock) => void;
}

/**
 * Renders the row.
 *
 * @returns the drop-down and the button
 */
export function AddBlockRow({ content, onAdd }: AddBlockRowProps) {
  const { t } = useLandingPageTranslation();
  // Step 1: the kinds on offer; the hero only while there is none.
  const hasHero = content.blocks.some((block) => block.kind === 'hero');
  const kinds = landingBlockKinds.filter((kind) => kind !== 'hero' || !hasHero);
  const [chosen, setChosen] = useState<LandingBlockKind>(kinds[0] ?? 'text');
  // Step 2: the choice can go stale when the hero is added; fall back to the first kind left.
  const kind = kinds.includes(chosen) ? chosen : (kinds[0] ?? 'text');
  const isFull = content.blocks.length >= landingMostBlocks;
  // Step 3: the families, each with the kinds still on offer (the hero's family empties out).
  const groups = landingBlockFamilies
    .map((entry) => ({
      label: t(`families.${entry.family}`),
      options: entry.kinds
        .filter((each) => kinds.includes(each))
        .map((each) => ({ value: each, label: t(`kinds.${each}`) })),
    }))
    .filter((group) => group.options.length > 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          id="landing-add-block-kind"
          label={t('editor.addKind')}
          isLabelVisible
          placement="form"
          value={kind}
          onChange={(value) => setChosen(kinds.find((each) => each === value) ?? kind)}
          options={[]}
          groups={groups}
          descriptionId="landing-add-block-hint"
        />
        <Button
          variant="secondary"
          disabled={isFull}
          onClick={() => onAdd(newBlock(kind, crypto.randomUUID()))}
        >
          {t('editor.addBlock')}
        </Button>
        {isFull && (
          <p className="m-0 text-sm text-meta">{t('editor.full', { most: landingMostBlocks })}</p>
        )}
      </div>
      <p id="landing-add-block-hint" className="m-0 text-sm text-meta">
        {t(`kindHints.${kind}`)}
      </p>
    </div>
  );
}
