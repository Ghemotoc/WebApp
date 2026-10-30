/**
 * HeadlineLine: one line of the home page headline, with the gold underline under the chosen word
 * (stories S1-E11-06 and S1-E5-08; board Website-Home).
 *
 * The underline is a decorative SVG hidden from screen readers (S1-E11-06 legal note: decoration
 * only), drawn in the gold token so it works in light and night mode.
 * Who uses it: HomeHero and the editor's HeroPreview.
 */
import { splitAroundWord } from '../lib/headline';

/** What a line needs. */
interface HeadlineLineProps {
  line: string;
  underlinedWord: string;
}

/**
 * Renders the line.
 *
 * @returns the words, with the underlined one wrapped
 */
export function HeadlineLine({ line, underlinedWord }: HeadlineLineProps) {
  const parts = splitAroundWord(line, underlinedWord);
  if (parts.underlined === '') return <>{line}</>;
  return (
    <>
      {parts.before}
      <span className="relative inline-block isolate">
        {parts.underlined}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="absolute -bottom-[0.14em] -left-[2%] -z-10 h-[0.26em] w-[104%] overflow-visible text-gold"
        >
          <path
            d="M1 13 C 22 5 48 9 70 12 C 81 13 90 14 99 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>
      {parts.after}
    </>
  );
}
