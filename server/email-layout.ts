/**
 * The branded HTML layout every member email uses (story S1-E11-19; boards E01 to E05, the Emails
 * page of the member design file, approved by Robert).
 *
 * What it draws: a 600 px table layout that email apps understand (no flexbox, no grid, every style
 * inline), on a white page: the logo and the product name, one card (#F4F0EC, a 1 px #E4DCD3 edge,
 * 16 px corners) holding the heading, the words, one pill button (#48125D with #FBF7EC text) or a
 * code, the full link as text under the button, then the footer under the card ("An app by" and
 * the company's name, linking to its site, and the support address or the unsubscribe lines).
 * The link note doubles as the hidden preheader, the first line an inbox shows. Under 480 px wide
 * the card's padding shrinks and the button fills the width, so nothing scrolls sideways on a
 * phone. Emails are drawn in day colours only: email apps decide their own dark mode (board E01).
 * Nothing here is product-specific: every name, address and word comes in from the caller, which
 * reads them from the brand config and email.json with the admins' overrides (CLAUDE.md: names are
 * settings, not code).
 * Who calls it: server/send-email.ts (Auth emails), server/notification-emails.ts and
 * scripts/build-auth-email-templates.ts (the Supabase Auth templates used until the hook is on).
 * What it calls: nothing; it only builds text.
 */

/** The colours of boards E01 to E05, day mode only. */
const colours = {
  page: '#FFFFFF',
  card: '#F4F0EC',
  cardEdge: '#E4DCD3',
  button: '#48125D',
  buttonText: '#FBF7EC',
  heading: '#2A0E33',
  body: '#24133A',
  muted: '#4A3E60',
  link: '#3D4290',
};

/** The font stacks of the boards; email apps without the web fonts fall back to Helvetica or Arial. */
const fonts = {
  heading: "'Funnel Display','Helvetica Neue',Helvetica,Arial,sans-serif",
  body: "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif",
};

/**
 * Where a line of email.json takes its link: "Stop these emails with one click: {{link}}". The
 * caller reads the line with this marker left in, so the layout can make the words a link.
 */
export const LINK_MARKER = '{{link}}';

/** One line with an optional link, as email.json writes it ("…: {{link}}"). */
export interface LinkedLine {
  /** The words, with LINK_MARKER where the link goes, or no marker for plain words. */
  text: string;
  url?: string;
}

/** The pill button and the address it opens. */
export interface EmailAction {
  label: string;
  url: string;
  /** "Or paste this link into your browser:", shown above the full link under the button. */
  pasteLabel: string;
}

/** Everything one email says, already in the person's language and with the admins' wording. */
export interface EmailContent {
  heading: string;
  /** The hidden first line an inbox shows beside the subject: the link note when there is one. */
  preheader: string;
  paragraphs: string[];
  /** Lines shown as a list with dots and fine rules (a daily round-up, board E03). */
  listItems?: string[];
  action?: EmailAction;
  /** A code Supabase made, shown large instead of a button (a change of email). */
  code?: { label: string; value: string };
  /** "The link works once and expires after an hour." */
  linkNote?: string;
  /** "If you didn't ask for this…", under a fine rule. */
  notYou?: string;
  signOff: string;
  /** Lines under the card before "An app by …": why the email came and how to stop it. */
  footerLines?: LinkedLine[];
  /** "An app by <company>" (email.json madeBy): the company name in it links to its site. */
  madeBy: string;
  /** "Questions? Write to hello@…": the address in it becomes a mailto link. */
  questions?: string;
}

/** The brand parts of the layout, from the brand config. */
export interface EmailBrand {
  productName: string;
  companyName: string;
  companySiteUrl: string;
  supportEmail: string;
  /** The PNG logo's full address (email apps can't show SVG; board E01). */
  logoUrl: string;
}

/**
 * The address of the PNG logo on our own site, public/brand/email-logo.png.
 *
 * @param siteUrl - the site's address, for example from VITE_BRAND_SITE_DOMAIN
 * @returns the logo's absolute address
 */
export function emailLogoUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/brand/email-logo.png`;
}

/**
 * Makes text safe inside HTML and inside a quoted attribute.
 *
 * @param text - any text
 * @returns the escaped text
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escaped text with its line breaks kept, for a support answer or a comment's first words.
 *
 * @returns HTML text
 */
function textWithBreaks(text: string): string {
  return escapeHtml(text).split('\n').join('<br>');
}

/**
 * The words before a line's link, when the line ends with it ("Log in to keep it: {{link}}" gives
 * "Log in to keep it"). Used for a button's label and for a link that reads as words.
 *
 * @param text - a line with LINK_MARKER
 * @returns the words, or null when the link sits inside the sentence instead of at its end
 */
export function wordsBeforeLink(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.endsWith(LINK_MARKER)) return null;
  // Step 1: drop the marker and the colon in front of it.
  const words = trimmed.slice(0, -LINK_MARKER.length).trim().replace(/:$/, '').trim();
  return words === '' ? null : words;
}

/**
 * A line as HTML: the words that end in the link become the link; a link inside a sentence shows
 * its address; a line without a link is plain words.
 *
 * @param line - the words and the address
 * @returns HTML text
 */
export function linkedLineHtml(line: LinkedLine): string {
  const url = line.url ?? '';
  const linkStyle = `color:${colours.link}`;
  // Step 1: no link, or no marker: plain words.
  if (url === '' || !line.text.includes(LINK_MARKER)) {
    return escapeHtml(line.text.split(LINK_MARKER).join(url));
  }
  // Step 2: "Stop these emails with one click: {{link}}" reads as a link of its own.
  const words = wordsBeforeLink(line.text);
  if (words !== null) {
    return `<a href="${escapeHtml(url)}" style="${linkStyle}">${escapeHtml(words)}</a>`;
  }
  // Step 3: a link inside a sentence shows the address itself.
  const link = `<a href="${escapeHtml(url)}" style="${linkStyle};word-break:break-all">${escapeHtml(url)}</a>`;
  return line.text.split(LINK_MARKER).map(escapeHtml).join(link);
}

/**
 * One paragraph in the body text style.
 *
 * @returns an HTML paragraph
 */
function bodyParagraph(html: string): string {
  return `<p style="margin:0 0 16px;font:400 16px/25px ${fonts.body};color:${colours.body}">${html}</p>`;
}

/**
 * One small paragraph in the muted style (link notes, the footer).
 *
 * @returns an HTML paragraph
 */
function smallParagraph(html: string, size: 'note' | 'footer'): string {
  const font = size === 'note' ? '14px/22px' : '12px/18px';
  const margin = size === 'note' ? '0 0 8px' : '0 0 6px';
  return `<p style="margin:${margin};font:400 ${font} ${fonts.body};color:${colours.muted}">${html}</p>`;
}

/**
 * The round-up's list: a plum dot before each line and a fine rule between lines (board E03).
 *
 * @returns an HTML table, or nothing for an empty list
 */
function listHtml(items: string[]): string {
  if (items.length === 0) return '';
  const rows = items.map((item, index) => {
    const rule = index < items.length - 1 ? `border-bottom:1px solid ${colours.cardEdge};` : '';
    const dot = `<div style="width:8px;height:8px;border-radius:4px;background:${colours.button}"></div>`;
    return `<tr><td style="padding:14px 0;${rule}"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td width="18" style="vertical-align:top;padding-top:8px">${dot}</td><td style="font:400 16px/25px ${fonts.body};color:${colours.body}">${textWithBreaks(item)}</td></tr></table></td></tr>`;
  });
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px">${rows.join('')}</table>`;
}

/**
 * The pill button, then the full link as text so it can be copied when the button doesn't work.
 *
 * @returns the button and the full link, as two HTML parts, so the link note can sit between them
 */
function actionHtml(action: EmailAction): { button: string; fullLink: string } {
  const url = escapeHtml(action.url);
  const button = `<table role="presentation" cellpadding="0" cellspacing="0" class="email-button" style="margin:8px 0 20px"><tr><td style="border-radius:999px;background:${colours.button};text-align:center;padding:14px 28px"><a href="${url}" style="display:inline-block;font:600 16px/20px ${fonts.body};color:${colours.buttonText};text-decoration:none">${escapeHtml(action.label)}</a></td></tr></table>`;
  const fullLink = `<p style="margin:0 0 16px;font:400 13px/20px ${fonts.body};color:${colours.muted}">${escapeHtml(action.pasteLabel)}<br><a href="${url}" style="color:${colours.link};word-break:break-all">${url}</a></p>`;
  return { button, fullLink };
}

/**
 * The code Supabase made, in large spaced digits that are easy to read and type.
 *
 * @returns an HTML paragraph
 */
function codeHtml(code: { label: string; value: string }): string {
  return `<p style="margin:8px 0 20px"><span style="font:400 14px/22px ${fonts.body};color:${colours.muted}">${escapeHtml(code.label)}</span><br><strong style="display:inline-block;margin-top:8px;font:700 32px/40px ${fonts.body};letter-spacing:8px;color:${colours.heading}">${escapeHtml(code.value)}</strong></p>`;
}

/**
 * The link note, under the button or the code.
 *
 * @returns HTML, or nothing
 */
function linkNoteHtml(content: EmailContent): string {
  return content.linkNote === undefined ? '' : smallParagraph(escapeHtml(content.linkNote), 'note');
}

/**
 * The card's inside: heading, words, the button or the code, the notes and the sign-off.
 *
 * @returns HTML
 */
function cardInsideHtml(content: EmailContent): string {
  const parts = [
    `<h1 class="email-heading" style="margin:0 0 16px;font:700 28px/34px ${fonts.heading};color:${colours.heading}">${escapeHtml(content.heading)}</h1>`,
    ...content.paragraphs.map((paragraph) => bodyParagraph(textWithBreaks(paragraph))),
    listHtml(content.listItems ?? []),
  ];
  // Step 1: the one action, a code or a button, with the link note between the button and the link.
  if (content.code !== undefined) parts.push(codeHtml(content.code), linkNoteHtml(content));
  if (content.action !== undefined) {
    const { button, fullLink } = actionHtml(content.action);
    parts.push(button, linkNoteHtml(content), fullLink);
  }
  if (content.action === undefined && content.code === undefined) parts.push(linkNoteHtml(content));
  // Step 2: "if it wasn't you", under a fine rule, then the sign-off.
  if (content.notYou !== undefined) {
    parts.push(
      `<hr style="border:0;border-top:1px solid ${colours.cardEdge};margin:24px 0 20px">`,
      `<p style="margin:0 0 16px;font:400 14px/22px ${fonts.body};color:${colours.muted}">${escapeHtml(content.notYou)}</p>`,
    );
  }
  parts.push(
    `<p style="margin:0;font:600 15px/22px ${fonts.body};color:${colours.body}">${escapeHtml(content.signOff)}</p>`,
  );
  return parts.filter((part) => part !== '').join('\n');
}

/**
 * A line with one word or address made a link (the company name, the support address).
 *
 * @param line - the whole line
 * @param word - the part to link; when it isn't in the line, the line stays plain
 * @param url - where it goes
 * @returns HTML text
 */
function lineWithLinkedWord(line: string, word: string, url: string): string {
  const position = word === '' ? -1 : line.indexOf(word);
  if (position < 0) return escapeHtml(line);
  const before = escapeHtml(line.slice(0, position));
  const after = escapeHtml(line.slice(position + word.length));
  return `${before}<a href="${escapeHtml(url)}" style="color:${colours.muted}">${escapeHtml(word)}</a>${after}`;
}

/**
 * The footer under the card: why the email came and how to stop it, "An app by …" and the
 * support address.
 *
 * @returns HTML
 */
function footerHtml(content: EmailContent, brand: EmailBrand): string {
  const lines = (content.footerLines ?? []).map((line) =>
    smallParagraph(linkedLineHtml(line), 'footer'),
  );
  // Robert, 23 Nov 2026: the company's name links to its own site.
  lines.push(
    smallParagraph(
      lineWithLinkedWord(content.madeBy, brand.companyName, brand.companySiteUrl),
      'footer',
    ),
  );
  if (content.questions !== undefined) {
    const mailto = `mailto:${brand.supportEmail}`;
    lines.push(
      smallParagraph(lineWithLinkedWord(content.questions, brand.supportEmail, mailto), 'footer'),
    );
  }
  return lines.join('\n');
}

/**
 * The logo row above the card: the PNG emblem and the product name in Funnel Display.
 *
 * @returns HTML
 */
function logoRowHtml(brand: EmailBrand): string {
  // alt is empty: the product name sits beside it as text, so a reader hears it once.
  const logo = `<img src="${escapeHtml(brand.logoUrl)}" width="30" height="33" alt="" style="display:block;border:0">`;
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;padding-right:10px">${logo}</td><td style="vertical-align:middle;font:700 24px/1 ${fonts.heading};color:${colours.heading};letter-spacing:-0.2px">${escapeHtml(brand.productName)}</td></tr></table>`;
}

/**
 * The body of one email: the hidden preheader, the logo, the card and the footer. The Supabase
 * template builder puts two of these (Romanian and English) in one document.
 *
 * @param content - what the email says
 * @param brand - the names and addresses from the brand config
 * @returns HTML for inside <body>
 */
export function renderEmailBody(content: EmailContent, brand: EmailBrand): string {
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(content.preheader)}</div>`;
  return `${preheader}
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${colours.page}"><tr><td style="padding:40px 0 44px">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto">
<tr><td class="email-gutter" style="padding:0 8px 20px">${logoRowHtml(brand)}</td></tr>
<tr><td class="email-gutter" style="padding:0 8px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${colours.card};border:1px solid ${colours.cardEdge};border-radius:16px"><tr><td class="email-card" style="padding:40px 40px 32px">
${cardInsideHtml(content)}
</td></tr></table></td></tr>
<tr><td class="email-gutter" style="padding:20px 8px 0">
${footerHtml(content, brand)}
</td></tr>
</table>
</td></tr></table>`;
}

/**
 * The phone rules (board E01, frame 3): smaller padding and a full-width button under 480 px.
 * Email apps that drop <style> still get the 600 px layout, which shrinks with the window.
 */
const phoneStyles = `@media (max-width:480px){.email-gutter{padding-left:12px!important;padding-right:12px!important}.email-card{padding:28px 20px 24px!important}.email-heading{font-size:24px!important;line-height:30px!important}.email-button{width:100%!important}.email-button a{display:block!important}}`;

/**
 * The whole HTML document around one or more bodies.
 *
 * @param parts - lang: the html lang attribute; title: escaped title text; body: the body HTML
 * @returns the document
 */
export function renderEmailDocument(parts: { lang: string; title: string; body: string }): string {
  return `<!doctype html>
<html lang="${parts.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${parts.title}</title>
<style>${phoneStyles}</style>
</head>
<body style="margin:0;padding:0;background:${colours.page};-webkit-text-size-adjust:100%">
${parts.body}
</body>
</html>
`;
}

/**
 * One email in one language as a finished HTML document.
 *
 * @param language - "ro" or "en", for the lang attribute screen readers use
 * @param content - what the email says
 * @param brand - the names and addresses
 * @returns the HTML part of the email
 */
export function renderEmailHtml(
  language: string,
  content: EmailContent,
  brand: EmailBrand,
): string {
  return renderEmailDocument({
    lang: escapeHtml(language),
    title: escapeHtml(content.heading),
    body: renderEmailBody(content, brand),
  });
}
