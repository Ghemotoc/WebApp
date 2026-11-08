/**
 * SketchTools: the sketch pad's toolbar (story S1-E3-11; board 4.3, "Drawing tools").
 *
 * Board values: Pen and Eraser as chips (the pressed one shows a tick, DoD pill system), three
 * 44 px colour swatches (ink #26142E, red #8C2B3A, blue #2E4A8C, each with a white inner ring and
 * a plum outer ring when chosen), then Undo and Clear. Every button says whether it is pressed
 * (aria-pressed), so the choice never rests on colour alone. A chosen colour also switches back to
 * the pen, which is what a writer means by picking one.
 * Who uses it: DrawingInsertDialog. What it calls: the shared Chip.
 */
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';

import { SKETCH_COLOURS, type SketchColour, type SketchTool } from '../lib/sketchPad';

/** What the toolbar needs. */
export interface SketchToolsProps {
  tool: SketchTool;
  colour: SketchColour;
  canUndo: boolean;
  onToolChange: (tool: SketchTool) => void;
  onColourChange: (colour: SketchColour) => void;
  onUndo: () => void;
  onClear: () => void;
}

/** The colours in the board's order. */
const colourOrder: SketchColour[] = ['black', 'red', 'blue'];

/** One colour swatch. */
function ColourSwatch(props: { colour: SketchColour; isChosen: boolean; onChoose: () => void }) {
  const { t } = useTranslation('editor');
  return (
    <button
      type="button"
      aria-label={t(`drawingDialog.colour.${props.colour}`)}
      aria-pressed={props.isChosen}
      onClick={props.onChoose}
      style={{ background: SKETCH_COLOURS[props.colour] }}
      className={`size-11 cursor-pointer rounded-full border-[3px] border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${
        props.isChosen ? 'shadow-[0_0_0_2px_#481C5F]' : 'shadow-[0_0_0_1px_#8E7B99]'
      }`}
    />
  );
}

/** A plain text button for Undo and Clear. */
function ToolButton(props: { label: string; isDisabled: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      disabled={props.isDisabled}
      onClick={props.onPress}
      className="inline-flex h-11 cursor-pointer items-center rounded-full button-glass px-[18px] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:cursor-not-allowed disabled:opacity-60"
    >
      {props.label}
    </button>
  );
}

/**
 * Renders the toolbar.
 *
 * @returns a toolbar group with the tools, the colours, Undo and Clear
 */
export function SketchTools(props: SketchToolsProps) {
  const { t } = useTranslation('editor');
  return (
    <div
      role="group"
      aria-label={t('drawingDialog.toolsLabel')}
      className="flex flex-wrap items-center gap-1.5"
    >
      <Chip isPressed={props.tool === 'pen'} onPressedChange={() => props.onToolChange('pen')}>
        {t('drawingDialog.pen')}
      </Chip>
      <Chip
        isPressed={props.tool === 'eraser'}
        onPressedChange={() => props.onToolChange('eraser')}
      >
        {t('drawingDialog.eraser')}
      </Chip>
      {colourOrder.map((colour) => (
        <ColourSwatch
          key={colour}
          colour={colour}
          isChosen={props.tool === 'pen' && props.colour === colour}
          onChoose={() => {
            props.onColourChange(colour);
            props.onToolChange('pen');
          }}
        />
      ))}
      <ToolButton
        label={t('drawingDialog.undo')}
        isDisabled={!props.canUndo}
        onPress={props.onUndo}
      />
      <ToolButton
        label={t('drawingDialog.clear')}
        isDisabled={!props.canUndo}
        onPress={props.onClear}
      />
    </div>
  );
}
