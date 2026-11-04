/**
 * CanvaTemplatePicker: "Where do you want to start?" on the Canva start page: a blank design or
 * one of three cover templates with the story's title and the writer's pen name already placed
 * (bundle IDEAS-2, part e; idea IDEA-20261101-10).
 *
 * Each choice is a real radio button with its name and a line on what it gives; a small sketch
 * of the cover beside it shows the title and pen name in place and is hidden from screen readers
 * (the label says the same). "Open Canva" leaves for Canva with the chosen one; blank is chosen
 * at first, so pressing straight on gives today's empty cover (criterion 2).
 * Who shows it: CanvaStartPage. What it calls: nothing; the page's hook does the opening.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { canvaTemplateKeys, type CanvaTemplateKey } from '@/schemas/canva';

/** What the picker needs. */
interface CanvaTemplatePickerProps {
  storyTitle: string;
  penName: string;
  onOpen: (template: CanvaTemplateKey) => void;
}

/** Each template's sketch: its box and how the title and the name sit in it. */
const sketchStyles: Record<CanvaTemplateKey, { box: string; title: string; name: string }> = {
  blank: { box: 'border-dashed bg-surface', title: 'hidden', name: 'hidden' },
  classic: {
    box: 'items-center justify-start bg-[#481C5F] pt-4 text-center text-white',
    title: 'font-heading text-[13px] font-bold',
    name: 'text-[9px]',
  },
  bold: {
    box: 'items-start justify-end bg-[#26142E] p-2 text-white',
    title: 'font-heading text-[15px] leading-none font-extrabold uppercase',
    name: 'text-[9px] font-semibold',
  },
  handwritten: {
    box: 'items-center justify-center bg-[#F6EBDD] text-center text-[#26142E]',
    title: 'font-(family-name:--font-hand) text-[15px]',
    name: 'font-(family-name:--font-hand) text-[10px]',
  },
};

/**
 * A small sketch of one template with the title and name in place; decorative.
 *
 * @returns the sketch
 */
function TemplateSketch({
  template,
  storyTitle,
  penName,
}: {
  template: CanvaTemplateKey;
  storyTitle: string;
  penName: string;
}) {
  const style = sketchStyles[template];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex aspect-[5/8] w-[64px] shrink-0 flex-col gap-1 overflow-hidden rounded-[8px] border border-border px-1.5',
        style.box,
      )}
    >
      <span className={cn('break-words', style.title)}>{storyTitle}</span>
      <span className={style.name}>{penName}</span>
    </span>
  );
}

/**
 * Renders the choice and the button.
 *
 * @returns the picker
 */
export function CanvaTemplatePicker({ storyTitle, penName, onOpen }: CanvaTemplatePickerProps) {
  const { t } = useTranslation('writing');
  const [chosen, setChosen] = useState<CanvaTemplateKey>('blank');
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onOpen(chosen);
      }}
    >
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 font-heading text-[20px] font-bold text-heading">
          {t('canva.templates.legend')}
        </legend>
        {canvaTemplateKeys.map((template) => (
          <label
            key={template}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-[14px] border p-3',
              chosen === template ? 'border-link bg-tint' : 'border-border bg-surface',
            )}
          >
            <input
              type="radio"
              name="canva-template"
              value={template}
              checked={chosen === template}
              onChange={() => setChosen(template)}
              className="size-6 shrink-0 cursor-pointer accent-(--link)"
            />
            <TemplateSketch template={template} storyTitle={storyTitle} penName={penName} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-heading">
                {t(`canva.templates.${template}.name`)}
              </span>
              <span className="text-[13px] text-meta">{t(`canva.templates.${template}.hint`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <Button type="submit">{t('canva.templates.open')}</Button>
      </div>
    </form>
  );
}
