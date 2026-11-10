/**
 * GlassListRow: one row of a GlassList: a bold name, a grey line under it, an optional pill on the
 * right and a chevron when the row opens something (bundle G10 ATLAS, part a; the boards' glist
 * ".it" rows, at least 60 px tall, split by a fine line).
 *
 * The open row (aria-current) sits on the soft tint and its name is bold, so it shows by shape,
 * not colour alone (WCAG 1.4.1).
 * Who uses it: CastAtAGlance, RecentChaptersList and CastList. What it calls: React Router's Link.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { cn } from '@/lib/utils';

/**
 * Renders the row as a list item.
 *
 * @param props.to - where the row goes
 * @param props.title - the bold name
 * @param props.line - the grey line under it; nothing when empty
 * @param props.end - a pill or note on the right
 * @param props.isCurrent - true for the item open now
 * @returns the <li> with its link
 */
export function GlassListRow({
  to,
  title,
  line,
  end,
  isCurrent = false,
}: {
  to: string;
  title: string;
  line?: string;
  end?: ReactNode;
  isCurrent?: boolean;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        to={to}
        aria-current={isCurrent ? 'page' : undefined}
        className={cn(
          'flex min-h-[60px] items-center gap-3.5 px-[18px] py-2.5 text-heading no-underline hover:bg-tint',
          isCurrent && 'bg-tint',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn('text-[15px] break-words', isCurrent ? 'font-bold' : 'font-semibold')}
          >
            {title}
          </span>
          {line !== undefined && line !== '' && (
            <span className="text-[13px] break-words text-meta">{line}</span>
          )}
        </span>
        {end !== undefined && <span className="shrink-0">{end}</span>}
        <ChevronRightIcon aria-hidden="true" className="shrink-0 text-meta" />
      </Link>
    </li>
  );
}
