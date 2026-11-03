/**
 * FeaturedFields: how a Featured stories block picks its stories: by hand (story addresses, one
 * per line, at most 12) or by tag (story S1-E11-14 criterion 7; bundle CONTESTS-13a2a).
 *
 * Whichever way, visitors see only stories rated for the page's youngest readers (its Who can
 * enter block), and a story hidden by moderation drops off at once; the editor says so, because
 * the filtering happens when the page is read, not here.
 * Who shows it: BlockSharedFields for a Featured block. What it calls: storySlugsFromText().
 */
import { useState } from 'react';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import {
  landingFeaturedModes,
  landingMostFeatured,
  type LandingBlock,
} from '@/schemas/landingPages';

import { storySlugsFromText } from '../../lib/blocks';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the fields need. */
interface FeaturedFieldsProps {
  block: LandingBlock;
  index: number;
  problems: readonly FieldProblem[];
  onChange: (block: LandingBlock) => void;
}

/**
 * The story addresses, typed one per line. The box keeps what the admin typed; the block keeps
 * the story names read from it.
 *
 * @returns the text area
 */
function StoryAddressesField({ block, index, problems, onChange }: FeaturedFieldsProps) {
  const { t } = useLandingPageTranslation();
  const [typed, setTyped] = useState((block.story_slugs ?? []).join('\n'));
  const problem = problemFor(problems, `blocks.${index}.stories`);
  const count = (block.story_slugs ?? []).length;
  return (
    <div className="flex flex-col gap-1">
      <Textarea
        id={`landing-b${index}-stories`}
        label={t('editor.featured.stories')}
        hint={t('editor.featured.storiesHint', { most: landingMostFeatured })}
        rows={4}
        value={typed}
        aria-invalid={problem === null && count <= landingMostFeatured ? undefined : true}
        onChange={(event) => {
          setTyped(event.target.value);
          onChange({ ...block, story_slugs: storySlugsFromText(event.target.value) });
        }}
      />
      <span className="text-xs text-meta">
        {t('editor.featured.count', { count, most: landingMostFeatured })}
      </span>
      {problem !== null && (
        <p className="m-0 text-sm text-destructive">{t(`editor.problems.stories_${problem}`)}</p>
      )}
    </div>
  );
}

/**
 * Renders the choice and its field.
 *
 * @returns the fieldset
 */
export function FeaturedFields(props: FeaturedFieldsProps) {
  const { t } = useLandingPageTranslation();
  const { block, index, problems, onChange } = props;
  const mode = block.mode ?? 'hand';
  const tagProblem = problemFor(problems, `blocks.${index}.tag`);
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold text-ink">
        {t('editor.featured.legend')}
      </legend>
      <ChoiceChips
        label={t('editor.featured.mode')}
        value={mode}
        onChange={(value) =>
          onChange({
            ...block,
            mode: landingFeaturedModes.find((each) => each === value) ?? 'hand',
          })
        }
        options={landingFeaturedModes.map((each) => ({
          value: each,
          label: t(`editor.featured.modes.${each}`),
        }))}
      />
      {mode === 'hand' ? (
        <StoryAddressesField {...props} />
      ) : (
        <div className="w-full max-w-[320px]">
          <TextInput
            id={`landing-b${index}-tag`}
            label={t('editor.featured.tag')}
            value={block.tag ?? ''}
            errorMessage={tagProblem === null ? undefined : t('editor.problems.tag_unknown')}
            onChange={(event) => onChange({ ...block, tag: event.target.value })}
          />
        </div>
      )}
      <p className="m-0 text-sm text-meta">{t('editor.featured.filterNote')}</p>
    </fieldset>
  );
}
