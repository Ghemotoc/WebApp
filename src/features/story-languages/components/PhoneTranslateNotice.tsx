/**
 * PhoneTranslateNotice: what a phone shows instead of the translation editor (CALM-9, board D09
 * "Translate a chapter": "Phone: no translating").
 *
 * Why: the original and the translation need to sit side by side, which a phone's width can't
 * hold. The draft stays saved; the writer goes back to the story's languages.
 * Who shows it: TranslationEditorPage, under the md width only (the editor is hidden there).
 */
import { Link } from 'react-router';

import { buttonStyles } from '@/components/ui/buttonStyles';

import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the notice needs. */
export interface PhoneTranslateNoticeProps {
  /** The original story's address part, for "Back to languages". */
  originalSlug: string;
  chapterNumber: number;
  languageName: string;
}

/**
 * Renders the notice.
 *
 * @returns the phone's card
 */
export function PhoneTranslateNotice({
  originalSlug,
  chapterNumber,
  languageName,
}: PhoneTranslateNoticeProps) {
  const { t } = useStoryLanguagesTranslation();
  return (
    <section className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-5 md:hidden">
      <h2 className="m-0 text-xl">{t('editor.phone.heading')}</h2>
      <p className="m-0 text-body">
        {t('editor.phone.line', { number: chapterNumber, language: languageName })}
      </p>
      <Link
        to={`/write/s/${originalSlug}/languages`}
        className={buttonStyles({ variant: 'secondary' })}
      >
        {t('editor.phone.back')}
      </Link>
    </section>
  );
}
