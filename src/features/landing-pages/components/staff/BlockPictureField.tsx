/**
 * BlockPictureField: the picture of a Hero or Text block in the editor: upload, its check state
 * and "Remove picture" (story S1-E11-14 criterion 5; bundle CONTESTS-13a2a).
 *
 * The upload goes through the picture check like every other (CLAUDE.md rule 19). Staff upload
 * it, so it skips the moderator step (bundle G12a); a picture the check flags still waits for a
 * moderator. The block keeps the picture's ID; its alt text is written in each language column.
 * Publishing waits until the picture is cleared.
 * Who shows it: BlockCard for a Hero or Text block. What it calls: useLandingPictureUpload() and
 * PictureUploadField from the pictures feature.
 */
import { Button } from '@/components/ui/Button';
import type { PictureView } from '@/features/pictures/api/pictures';
import { PictureUploadField } from '@/features/pictures/components/PictureUploadField';
import { uploadOutcomeOf } from '@/features/pictures/hooks/usePictureUpload';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import type { LandingBlock } from '@/schemas/landingPages';

import { useLandingPictureUpload } from '../../hooks/useLandingPictures';
import { withPicture } from '../../lib/blocks';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the field needs. */
interface BlockPictureFieldProps {
  pageId: string;
  block: LandingBlock;
  index: number;
  pictures: Record<string, PictureView>;
  problems: readonly FieldProblem[];
  onChange: (block: LandingBlock) => void;
}

/**
 * Renders the field.
 *
 * @returns the upload field, the picture's state and Remove
 */
export function BlockPictureField({
  pageId,
  block,
  index,
  pictures,
  problems,
  onChange,
}: BlockPictureFieldProps) {
  const { t } = useLandingPageTranslation();
  const upload = useLandingPictureUpload(pageId);
  const problem = problemFor(problems, `blocks.${index}.picture`);
  const view = block.picture_id === undefined ? undefined : pictures[block.picture_id];
  /** Uploads the file and puts the new picture in the block. */
  const pick = (file: File) =>
    upload.mutate(file, { onSuccess: (result) => onChange(withPicture(block, result.pictureId)) });
  return (
    <div className="flex flex-col gap-2">
      <PictureUploadField
        label={t('editor.picture.label')}
        hint={t('editor.picture.hint')}
        isUploading={upload.isPending}
        outcome={uploadOutcomeOf(upload.data?.status, upload.error)}
        onPick={pick}
      />
      {block.picture_id !== undefined && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 text-sm text-body">
            {t(`picture.states.${view?.state ?? 'checking'}`)}
          </p>
          <Button variant="destructive" onClick={() => onChange(withPicture(block, null))}>
            {t('editor.picture.remove')}
          </Button>
        </div>
      )}
      {problem !== null && (
        <p className="m-0 text-sm text-destructive">{t(`editor.problems.picture_${problem}`)}</p>
      )}
    </div>
  );
}
