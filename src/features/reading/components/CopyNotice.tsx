/**
 * CopyNotice: the honest line under a chapter about copying (story S1-E4-06a; board 3.5).
 *
 * Board values: a plum-tint box with 16 px corners, a shield icon and 14 px text: "On the web,
 * right-click and copying are turned off for chapters. That makes copying harder, but it can't
 * stop screenshots. <pen name> keeps all the rights to this story." The wording follows Q9
 * (16 Oct 2026): it says "makes copying harder", never "can't be copied"; a unit test keeps those
 * phrases out of the locale files (copyWording.test.ts).
 * Who uses it: ChapterReaderPage, after the chapter and before the banner slot.
 */
import { useTranslation } from 'react-i18next';

/** The shield, drawn as a plain status icon (the reader has no doodles); hidden from screen readers. */
function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-px flex-none text-heading"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}

/**
 * Renders the notice.
 *
 * @returns the paragraph
 */
export function CopyNotice({ penName }: { penName: string }) {
  const { t } = useTranslation('reading');
  return (
    <p className="mx-auto mt-7 flex w-full max-w-[760px] items-start gap-2.5 rounded-2xl bg-tint px-[18px] py-3.5 text-sm leading-[1.55] text-ink">
      <ShieldIcon />
      <span>{t('reader.copyNotice', { penName })}</span>
    </p>
  );
}
