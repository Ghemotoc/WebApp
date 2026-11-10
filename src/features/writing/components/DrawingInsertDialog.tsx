/**
 * DrawingInsertDialog: the sketch pad, opened from Insert › Drawing (story S1-E3-11 criteria 1
 * and 2; board 4.3, "Sketch pad").
 *
 * What it does: a native <dialog> (focus stays inside, Escape closes) with the drawing tools (pen,
 * eraser, three brand colours, Undo, Clear), the sheet, the alt text every chapter picture needs
 * (S1-E3-09) and the line on which pictures are allowed (bundle ADMIN-2, part e1, which also
 * removed the rights tick box). "Insert drawing" refuses an empty sheet or missing alt text;
 * otherwise it turns the sheet into a PNG and sends it
 * through the picture upload of S1-E3-09 (metadata removed, resized, then the picture check), and
 * the drawing goes in the chapter where the cursor was, as a picture (criterion 2).
 * Who uses it: ChapterInsertControls. What it calls: useSketchPad, useChapterPictureUpload, then
 * insertChapterPicture() (lib/chapterPictureNode.ts).
 */
import type { Editor } from '@tiptap/react';
import { useRef, useState, type FormEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { PictureRulesNote } from '@/features/pictures/components/PictureRulesNote';
import { useChapterPictureUpload } from '@/features/pictures/hooks/useChapterPictures';
import { MAXIMUM_ALT_TEXT_LENGTH } from '@/lib/chapter-pictures';

import { useNativeDialog } from '../hooks/useNativeDialog';
import { useSketchPad } from '../hooks/useSketchPad';
import { insertChapterPicture } from '../lib/chapterPictureNode';
import { pictureFailureMessage } from '../lib/pictureFailure';
import { hasInk } from '../lib/sketchPad';

import { SketchPadCanvas } from './SketchPadCanvas';
import { SketchTools } from './SketchTools';
import { useEditorTranslation } from '../registerEditorTranslations';

/** What the dialog needs. */
export interface DrawingInsertDialogProps {
  editor: Editor;
  /** The chapter's row ID: the drawing goes in its pictures' folder. */
  chapterId: string;
  isOpen: boolean;
  onClose: () => void;
}

/** Which parts are missing, after the writer pressed "Insert drawing". */
interface MissingParts {
  ink: boolean;
  alt: boolean;
}

/**
 * The sheet as a PNG file.
 *
 * @param canvas - the sheet
 * @returns the file, or null when the browser couldn't make one
 */
function drawingFile(canvas: HTMLCanvasElement): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob === null ? null : new File([blob], 'drawing.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

/**
 * The pad, the two fields, the upload and the two ways out: inserted or closed. Either way the
 * dialog starts empty next time.
 *
 * @returns everything the dialog draws, submit(event) and close()
 */
function useDrawingInsert(props: DrawingInsertDialogProps) {
  const { editor, chapterId, onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pad = useSketchPad();
  const [alt, setAlt] = useState('');
  const [missing, setMissing] = useState<MissingParts | null>(null);
  const uploading = useChapterPictureUpload();

  /** Closes and empties everything for next time. */
  function close() {
    pad.reset();
    setAlt('');
    setMissing(null);
    uploading.reset();
    onClose();
  }

  /** Insert: ink and alt text first; then the file, the upload and the picture. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    const stillMissing = {
      ink: !hasInk(pad.strokes),
      alt: alt.trim() === '',
    };
    const isComplete = !stillMissing.ink && !stillMissing.alt;
    setMissing(isComplete ? null : stillMissing);
    if (!isComplete || canvasRef.current === null) return;
    const file = await drawingFile(canvasRef.current);
    if (file === null) return;
    const uploaded = await uploading.upload({ chapterId, file }).catch(() => null);
    // A refusal stays on screen (uploading.error); the drawing and the fields are kept.
    if (uploaded === null) return;
    insertChapterPicture(editor, { pictureId: uploaded.pictureId, alt: alt.trim() });
    close();
  }

  return {
    canvasRef,
    pad,
    alt,
    setAlt,
    missing,
    uploading,
    submit,
    close,
  };
}

/** The alt text, the picture rules and the note on the picture check. */
function DrawingFields(props: {
  alt: string;
  missing: MissingParts | null;
  onAltChange: (alt: string) => void;
}) {
  const { t } = useEditorTranslation();
  return (
    <>
      <TextInput
        id="chapter-drawing-alt"
        label={t('pictureDialog.altLabel')}
        value={props.alt}
        maxLength={MAXIMUM_ALT_TEXT_LENGTH}
        required
        onChange={(event) => props.onAltChange(event.target.value)}
        hint={t('drawingDialog.altHint')}
        errorMessage={props.missing?.alt === true ? t('pictureDialog.missingAlt') : undefined}
      />
      <PictureRulesNote id="chapter-drawing-rules" />
      <p className="m-0 text-sm text-body">{t('drawingDialog.savedNote')}</p>
    </>
  );
}

/** The tools, the sheet and the "Draw something first" message. */
function DrawingSketch(props: {
  pad: ReturnType<typeof useSketchPad>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isInkMissing: boolean;
}) {
  const { t } = useEditorTranslation();
  const { pad } = props;
  return (
    <>
      <SketchTools
        tool={pad.tool}
        colour={pad.colour}
        canUndo={pad.strokes.length > 0}
        onToolChange={pad.setTool}
        onColourChange={pad.setColour}
        onUndo={pad.undo}
        onClear={pad.clear}
      />
      <SketchPadCanvas
        canvasRef={props.canvasRef}
        strokes={pad.strokes}
        keyboardPen={pad.keyboardPen}
        pointerHandlers={pad.pointerHandlers}
        onKeyDown={pad.onKeyDown}
      />
      {props.isInkMissing && <Notice tone="error">{t('drawingDialog.missingInk')}</Notice>}
    </>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed when isOpen is false)
 */
export function DrawingInsertDialog(props: DrawingInsertDialogProps) {
  const { t } = useEditorTranslation();
  const { t: tCommon } = useTranslation();
  const drawing = useDrawingInsert(props);
  const dialogRef = useNativeDialog(props.isOpen);
  const { pad, uploading } = drawing;
  const failure = uploading.error === null ? null : pictureFailureMessage(uploading.error);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chapter-drawing-heading"
      onClose={drawing.close}
      className="m-auto max-h-[92vh] w-[min(92vw,720px)] overflow-y-auto rounded-card border border-border bg-paper p-4 text-ink shadow-card backdrop:bg-ink/40 sm:p-6"
    >
      <form
        onSubmit={(event) => void drawing.submit(event)}
        noValidate
        className="flex flex-col gap-3"
      >
        <h2
          id="chapter-drawing-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('drawingDialog.heading')}
        </h2>
        <DrawingSketch
          pad={pad}
          canvasRef={drawing.canvasRef}
          isInkMissing={drawing.missing?.ink === true}
        />
        <DrawingFields alt={drawing.alt} missing={drawing.missing} onAltChange={drawing.setAlt} />
        <div aria-live="polite">
          {uploading.isUploading && (
            <p className="m-0 text-sm text-body">{t('drawingDialog.uploading')}</p>
          )}
          {failure !== null && <Notice tone="error">{tCommon(failure.key, failure.values)}</Notice>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={uploading.isUploading}>
            {t('drawingDialog.insert')}
          </Button>
          <Button variant="secondary" onClick={drawing.close}>
            {t('drawingDialog.cancel')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
