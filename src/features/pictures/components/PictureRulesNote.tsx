/**
 * PictureRulesNote: the line every upload screen shows about which pictures are allowed (bundle
 * ADMIN-2, part e1; Robert's brief of 2 Nov 2026, section 1: "Drawings and illustrations only, no
 * photos").
 *
 * It says the rule in one sentence, then lists the allowed kinds from the public setting
 * picture_allowed_kinds (so a later change is a list edit on Staff › Settings), and ends with what
 * is never allowed. The words are interface text, so admins can reword them (S1-E11-18).
 * Who shows it: CoverUploadField, PictureInsertDialog, DrawingInsertDialog, AvatarSettingsSection,
 * CharacterPictureSection, SpaceBannerPictureCard and SignaturePictureControls.
 * What it calls: usePublicSettings.
 */
import { useTranslation } from 'react-i18next';

import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';

/** The decided kinds, used while the settings load or if they can't be read. */
const decidedKinds = ['drawing', 'illustration', 'non_photographic_ai'] as const;

/**
 * The allowed kinds as words: "drawings, illustrations and AI pictures that don’t look like
 * photos". A kind added on Staff › Settings without its words yet shows as its key.
 *
 * @param kinds - the setting's keys
 * @param label - the translation for one key
 * @param language - the interface language, for "and" or "și"
 * @returns the list in one phrase
 */
function kindsPhrase(kinds: readonly string[], label: (kind: string) => string, language: string) {
  const words = kinds.map(label);
  return new Intl.ListFormat(language, { type: 'conjunction' }).format(words);
}

/**
 * Renders the note.
 *
 * @param props.id - an ID, so a file field can point at the note with aria-describedby
 * @returns the note
 */
export function PictureRulesNote({ id }: { id?: string }) {
  const { t, i18n } = useTranslation();
  const settings = usePublicSettings();
  const kinds = settings.wordsOf('picture_allowed_kinds', decidedKinds);
  const allowed = kindsPhrase(
    kinds,
    (kind) => t(`pictures.rules.kinds.${kind}`, { defaultValue: kind }),
    i18n.language,
  );
  return (
    <p id={id} className="m-0 text-[13px] text-body">
      <strong className="font-semibold">{t('pictures.rules.headline')}</strong>{' '}
      {t('pictures.rules.allowed', { kinds: allowed })} {t('pictures.rules.never')}
    </p>
  );
}
