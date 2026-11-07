/**
 * PictureRulesNote: the line every upload screen shows about which pictures are allowed, with one
 * "i" tooltip that lists them (bundle ADMIN-2, part e1; reworded in bundle PICTURES-1, Robert,
 * 7 Nov 2026: "just say upload picture … At most, add one of those information hover-over things
 * that shows what is accepted").
 *
 * The rule (7 Nov 2026, replacing "drawings and illustrations only, no photos" of 2 Nov): any
 * picture, photos of places and things included, as long as it never shows a real person or a
 * celebrity. The visible line says that in one sentence. The tooltip lists the allowed kinds from
 * the public setting picture_allowed_kinds (so a later change is a list edit on Staff › Settings)
 * and ends with what is never allowed. The words are interface text, so admins can reword them
 * (S1-E11-18).
 * The tooltip follows the one tooltip pattern (InfoTooltip; DoD design rules; WCAG 2.2, 1.4.13).
 * Its text is always in the page, and a file field lists both ids in aria-describedby
 * (pictureRulesIds in ../lib/pictureRulesIds.ts), so screen readers read the full list with the field.
 * Who shows it: PictureUploadField (CoverUploadField, CharacterPictureSection,
 * SpaceBannerPictureCard, SignaturePictureControls and the other picture fields), PictureInsertDialog
 * and DrawingInsertDialog.
 * What it calls: usePublicSettings, InfoTooltip and pictureRulesTooltipId.
 */
import { useTranslation } from 'react-i18next';

import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';

import { pictureRulesTooltipId } from '../lib/pictureRulesIds';

/** The decided kinds (7 Nov 2026), used while the settings load or if they can't be read. */
const decidedKinds = [
  'drawing',
  'illustration',
  'photo_of_places_and_things',
  'non_photographic_ai',
] as const;

/**
 * The allowed kinds as words: "drawings and drawn characters, illustrations and vectors, photos of
 * places and things and AI pictures that don’t look like a real person". A kind added on Staff ›
 * Settings without its words yet shows as its key.
 *
 * @param kinds - the setting's keys
 * @param label - the translation for one key
 * @param language - the interface language, for "and" or "și"
 * @returns the list in one phrase
 */
function kindsPhrase(kinds: readonly string[], label: (kind: string) => string, language: string) {
  const words = kinds.map(label);
  // British English lists have no comma before "and" (house style), which en-GB gives and en doesn't.
  const listLanguage = language === 'en' ? 'en-GB' : language;
  return new Intl.ListFormat(listLanguage, { type: 'conjunction' }).format(words);
}

/**
 * Renders the line and its tooltip.
 *
 * @param props.id - an ID, so a file field can point at the note with aria-describedby
 *   (use pictureRulesIds(id) to include the tooltip's list)
 * @returns the note
 */
export function PictureRulesNote({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const settings = usePublicSettings();
  // Step 1: the allowed kinds from the public setting, in words, joined with "and".
  const kinds = settings.wordsOf('picture_allowed_kinds', decidedKinds);
  const allowed = kindsPhrase(
    kinds,
    (kind) => t(`pictures.rules.kinds.${kind}`, { defaultValue: kind }),
    i18n.language,
  );
  // Step 2: the tooltip's text is the full list followed by what is never allowed.
  const tooltipText = `${t('pictures.rules.allowed', { kinds: allowed })} ${t('pictures.rules.never')}`;
  // The row is `relative` so the tooltip opens under it, lined up with the field (InfoTooltip).
  return (
    <div className="relative flex items-center gap-2">
      <p id={id} className="m-0 text-[13px] font-semibold text-body">
        {t('pictures.rules.headline')}
      </p>
      <InfoTooltip
        tooltipId={pictureRulesTooltipId(id)}
        buttonLabel={t('pictures.rules.infoLabel')}
        text={tooltipText}
      />
    </div>
  );
}
