/**
 * CmsMarkdown: shows a help page or an answer written in the CMS (story S1-E11-12).
 *
 * Who uses it: HelpPageView and QuestionList.
 * What it does: renders the safe Markdown subset with react-markdown, which never renders raw
 * HTML (CLAUDE.md rule 8). Links to our own pages stay in the app; any other link opens with
 * rel="nofollow ugc noopener" and only when it is an http, https or mailto address
 * (src/lib/safe-links.ts). Headings start at h2, because the page has its own h1 (S1-E11-12:
 * one h1 and real headings). The product name placeholder is filled from the brand config.
 */
import type { ComponentPropsWithoutRef } from 'react';
import Markdown, { type Components } from 'react-markdown';
import { Link } from 'react-router';

import { brand } from '@/config/brand';
import { fillBrandTokens } from '@/features/legal/lib/fillBrandTokens';
import { isAllowedLink } from '@/lib/safe-links';

/** What the component needs. */
interface CmsMarkdownProps {
  markdown: string;
  /** The language of this text, which can differ from the interface (WCAG 2.2, 3.1.2). */
  language: string;
}

/**
 * One link: ours in the app, anyone else's only when it is safe.
 *
 * @returns the link, or its words alone when the address isn't allowed
 */
function CmsLink({ href, children }: ComponentPropsWithoutRef<'a'>) {
  const address = href ?? '';
  const linkClass = 'text-link underline hover:text-link-hover';
  if (address.startsWith('/')) {
    return (
      <Link to={address} className={linkClass}>
        {children}
      </Link>
    );
  }
  if (!isAllowedLink(address)) return <>{children}</>;
  return (
    <a href={address} rel="nofollow ugc noopener" className={linkClass}>
      {children}
    </a>
  );
}

/** How each Markdown element looks; h1 becomes h2 so the page keeps one h1. */
const cmsComponents: Components = {
  h1: ({ children }) => (
    <h2 className="m-0 font-heading text-[22px] font-bold text-heading">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="m-0 font-heading text-[22px] font-bold text-heading">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="m-0 font-heading text-lg font-bold text-heading">{children}</h3>
  ),
  p: ({ children }) => <p className="m-0 leading-[1.6]">{children}</p>,
  ul: ({ children }) => <ul className="m-0 flex list-disc flex-col gap-2 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 flex list-decimal flex-col gap-2 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
  a: ({ href, children }) => <CmsLink href={href}>{children}</CmsLink>,
  img: () => null,
};

/**
 * Renders the Markdown.
 *
 * @returns the text as real HTML
 */
export function CmsMarkdown({ markdown, language }: CmsMarkdownProps) {
  return (
    <div lang={language} className="flex flex-col gap-3 text-body">
      <Markdown components={cmsComponents} skipHtml>
        {fillBrandTokens(markdown, brand)}
      </Markdown>
    </div>
  );
}
