/**
 * QuestionList: questions and answers that open one at a time (stories S1-E11-12 and S1-E5-08;
 * board Website-Home "Before you join").
 *
 * Each question is a native <details> and <summary>, so it opens by keyboard and screen readers
 * announce it as expandable without extra code. All the questions in one list share a `name`, so
 * the browser keeps only one open at a time: opening a question closes the one before (an
 * exclusive accordion; G5b, board Website-Home, where one answer shows at a time). The "+" turns
 * into a "×" while open. Answers are safe Markdown (CmsMarkdown). Each question's id is its key,
 * so a link such as #faq-class-space opens the right one.
 * Who uses it: WebsiteHomePage and HelpCentrePage. What it calls next: CmsMarkdown.
 */
import type { QuestionContent } from '@/schemas/websiteContent';

import type { ParsedEntry } from '../hooks/useWebsiteContent';
import { withBrand } from '../lib/brandText';

import { CmsMarkdown } from './CmsMarkdown';

/** What the list needs. */
interface QuestionListProps {
  questions: ParsedEntry<QuestionContent>[];
  /** Shared by the list's questions so only one is open at a time; unique on the page. */
  groupName: string;
}

/**
 * Renders the questions in their order.
 *
 * @returns the list
 */
export function QuestionList({ questions, groupName }: QuestionListProps) {
  const ordered = [...questions].sort(
    (first, second) => first.content.position - second.content.position,
  );
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {ordered.map((entry) => (
        <li key={entry.entryKey} className="border-b border-hairline">
          <details
            id={`faq-${entry.entryKey}`}
            name={groupName}
            lang={entry.languageCode}
            className="group py-4"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg font-bold text-heading">
              {withBrand(entry.content.question)}
              <span
                aria-hidden="true"
                className="text-2xl leading-none transition-transform group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <div className="pt-2">
              <CmsMarkdown markdown={entry.content.answer} language={entry.languageCode} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
