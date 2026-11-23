/**
 * CoverLookPicker: the cover's look and title font, in story settings (bundle CALM-4; handover
 * Step 2, cover kinds).
 *
 * What it shows: "Look" (Label, Big title or Initial for a drawn cover; Picture or Custom for an
 * uploaded one) and "Title font" (Literata, Funnel Display, Inter or Playwrite Cuba). Each pick
 * saves at once through set_my_story_cover_look(), on its own like the visibility, so it never
 * waits for the form's Save. The look belongs to the saved cover: while the form holds a cover
 * kind that is not saved yet, the look waits and says so. An automatic cover is always a Label,
 * so only its font can change.
 * Who uses it: StorySettingsPage, under CoverSection. What it calls: useCoverLook, ChoiceChips.
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Notice } from '@/components/ui/Notice';

import type { CoverStyleValue, CoverTitleFontValue, MyStory } from '../api/stories';
import { useCoverLook } from '../hooks/useCoverLook';

/** The looks each saved cover kind can have (the database's stories_cover_style_fits_kind). */
const stylesForKind: Record<MyStory['coverKind'], CoverStyleValue[]> = {
  automatic: ['label'],
  drawn: ['label', 'big_title', 'initial'],
  upload: ['picture', 'custom'],
};

/** The four title fonts, in the order the chips show them. */
const titleFonts: CoverTitleFontValue[] = ['reading', 'display', 'sans', 'hand'];

/** What the picker needs. */
export interface CoverLookPickerProps {
  story: MyStory;
  /** The cover kind the form holds now, which may not be saved yet. */
  formCoverKind: MyStory['coverKind'];
}

/**
 * The line under the chips: a wait, the saved note, or what went wrong.
 *
 * @returns the line, or null
 */
function SaveLine({ look }: { look: ReturnType<typeof useCoverLook> }) {
  const { t } = useTranslation('writing');
  if (look.isError) return <Notice tone="error">{t('cover.look.failed')}</Notice>;
  if (look.data === 'style_does_not_fit') {
    return <Notice tone="error">{t('cover.look.doesNotFit')}</Notice>;
  }
  if (look.data === 'ok') {
    return (
      <p className="m-0 type-meta text-ink-muted" role="status">
        {t('cover.look.saved')}
      </p>
    );
  }
  return null;
}

/**
 * Renders the picker.
 *
 * @returns the two chip groups and the save line
 */
export function CoverLookPicker({ story, formCoverKind }: CoverLookPickerProps) {
  const { t } = useTranslation('writing');
  const look = useCoverLook(story.slug);

  // Step 1: the look belongs to the saved cover; a kind not saved yet waits for the form's Save.
  if (formCoverKind !== story.coverKind) {
    return <p className="m-0 type-meta text-ink-muted">{t('cover.look.saveCoverFirst')}</p>;
  }

  // Step 2: the choices for this kind, and what the story has now (the latest pick while saving).
  const styleOptions = stylesForKind[story.coverKind].map((style) => ({
    value: style,
    label: t(`cover.look.styles.${style}`),
  }));
  const fontOptions = titleFonts.map((font) => ({
    value: font,
    label: t(`cover.look.fonts.${font}`),
  }));
  const current = look.variables ?? { style: story.coverStyle, titleFont: story.titleFont };

  return (
    <div className="flex flex-col gap-4">
      {story.coverKind === 'automatic' ? (
        <p className="m-0 type-meta text-ink-muted">{t('cover.look.automaticNote')}</p>
      ) : (
        <ChoiceChips
          label={t('cover.look.styleLabel')}
          isLabelVisible
          isLabelEyebrow
          options={styleOptions}
          value={current.style}
          onChange={(style) =>
            look.mutate({ style: style as CoverStyleValue, titleFont: current.titleFont })
          }
        />
      )}
      <ChoiceChips
        label={t('cover.look.fontLabel')}
        isLabelVisible
        isLabelEyebrow
        options={fontOptions}
        value={current.titleFont}
        onChange={(font) =>
          look.mutate({ style: current.style, titleFont: font as CoverTitleFontValue })
        }
      />
      <SaveLine look={look} />
    </div>
  );
}
