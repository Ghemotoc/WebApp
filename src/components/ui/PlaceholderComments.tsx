/**
 * PlaceholderComments: three grey comment shapes (a round picture and two lines of text) shown
 * while a list of comments loads (design books item 15, "Loading that looks like the page").
 *
 * It shows nothing for the first 300 ms, then the shapes in the same box the comments sit in, so
 * the page keeps its shape when they arrive. The shapes are hidden from screen readers; a short
 * "Loading the comments…" line says it instead, inside an aria-busy block.
 * Who uses it: CommentsSection and ParagraphThread (src/features/comments/).
 * What it calls: useShowAfter.
 */
import { useShowAfter } from '@/lib/loading/useShowAfter';

/** The width of each shape's second line, so the three don't look stamped out. */
const SECOND_LINE_WIDTHS = ['w-2/3', 'w-1/2', 'w-3/4'] as const;

/**
 * Renders the waiting comments after 300 ms, or nothing before then.
 *
 * @param props.label - what a screen reader hears while it waits, in the interface language
 * @param props.isBoxed - true to draw the shapes inside the comments' box (the chapter's list)
 * @returns the shapes, or null
 */
export function PlaceholderComments({
  label,
  isBoxed = true,
}: {
  label: string;
  isBoxed?: boolean;
}) {
  const isShown = useShowAfter();
  if (!isShown) return null;
  const boxClasses = isBoxed
    ? 'rounded-card border border-border bg-surface px-6 py-1 shadow-card'
    : '';
  return (
    <div aria-busy="true" className={`mt-4 flex flex-col ${boxClasses}`}>
      <p className="sr-only">{label}</p>
      <ul aria-hidden="true" className="m-0 flex list-none flex-col divide-y divide-hairline p-0">
        {SECOND_LINE_WIDTHS.map((width) => (
          <li key={width} className="flex gap-3 py-4">
            <div className="size-8 flex-none rounded-full bg-hairline motion-safe:animate-pulse" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-4 w-1/3 rounded-full bg-hairline motion-safe:animate-pulse" />
              <div className={`h-4 ${width} rounded-full bg-hairline motion-safe:animate-pulse`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
