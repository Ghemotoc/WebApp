/**
 * Unit tests for the branded email layout (story S1-E11-19; boards E01 to E05).
 * Who runs it: `npm test`. It checks what a reader of the email depends on: the hidden preheader,
 * the button with the full link under it, a code instead of a button, the footer's links, safe
 * escaping of every word, and the phone rules that keep a 375 px screen from scrolling sideways.
 * Names and addresses are made-up examples, never the brand's own (CLAUDE.md: names are settings).
 */
import { describe, expect, it } from 'vitest';

import {
  LINK_MARKER,
  emailLogoUrl,
  linkedLineHtml,
  renderEmailHtml,
  wordsBeforeLink,
  type EmailBrand,
  type EmailContent,
} from './email-layout';

const brand: EmailBrand = {
  productName: 'Product',
  companyName: 'Company Ltd',
  companySiteUrl: 'https://company.test',
  supportEmail: 'help@product.test',
  logoUrl: emailLogoUrl('https://product.test/'),
};

/** A confirmation email, as the hook would hand it over. */
function confirmation(overrides: Partial<EmailContent> = {}): EmailContent {
  return {
    heading: 'Confirm the email address',
    preheader: 'The link works once.',
    paragraphs: ['Press the button.'],
    action: {
      label: 'Confirm email',
      url: 'https://product.test/auth/confirm?token_hash=abc&type=email',
      pasteLabel: 'Or paste this link into your browser:',
    },
    linkNote: 'The link works once.',
    notYou: 'If you didn’t ask for this, ignore it.',
    signOff: 'The Product team',
    questions: 'Questions? Write to help@product.test',
    ...overrides,
  };
}

describe('the branded email layout', () => {
  it('opens with the link note as a hidden preheader, in the email’s language', () => {
    const html = renderEmailHtml('ro', confirmation(), brand);
    expect(html).toContain('<html lang="ro">');
    expect(html).toMatch(/<div style="display:none[^"]*">The link works once\.<\/div>/);
  });

  it('draws one pill button and shows its full link as text under it', () => {
    const html = renderEmailHtml('en', confirmation(), brand);
    const link = 'https://product.test/auth/confirm?token_hash=abc&amp;type=email';
    expect(html).toContain('background:#48125D');
    expect(html).toContain('color:#FBF7EC');
    expect(html.split(`href="${link}"`)).toHaveLength(3);
    expect(html).toContain(`Or paste this link into your browser:<br><a href="${link}"`);
  });

  it('puts everything in a 600 px card with the approved colours and corners', () => {
    const html = renderEmailHtml('en', confirmation(), brand);
    expect(html).toContain('max-width:600px');
    expect(html).toContain('background:#F4F0EC;border:1px solid #E4DCD3;border-radius:16px');
    expect(html).toContain('<body style="margin:0;padding:0;background:#FFFFFF');
  });

  it('shows the PNG logo from the site with the product name beside it', () => {
    const html = renderEmailHtml('en', confirmation(), brand);
    expect(html).toContain('<img src="https://product.test/brand/email-logo.png"');
    expect(html).toContain('alt=""');
    expect(html).toContain('>Product</td>');
  });

  it('names no company in the footer and links the support address to a new email', () => {
    const html = renderEmailHtml('en', confirmation(), brand);
    // Robert, 27 Nov 2026: no "An app by …" line anywhere.
    expect(html).not.toContain('An app by');
    expect(html).not.toContain('https://company.test');
    expect(html).toContain('<a href="mailto:help@product.test"');
  });

  it('shows a code instead of a button when the email carries one', () => {
    const html = renderEmailHtml(
      'en',
      confirmation({ action: undefined, code: { label: 'Code:', value: '482913' } }),
      brand,
    );
    expect(html).toContain('482913');
    expect(html).not.toContain('class="email-button"');
    expect(html).not.toContain('auth/confirm');
  });

  it('escapes every word, so a title with markup stays text', () => {
    const html = renderEmailHtml(
      'en',
      confirmation({ paragraphs: ['<script>alert(1)</script> “Sarea” & more'] }),
      brand,
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; “Sarea” &amp; more');
  });

  it('lists a round-up’s lines with a fine rule between them', () => {
    const html = renderEmailHtml('en', confirmation({ listItems: ['One.', 'Two.'] }), brand);
    expect(html).toContain('One.');
    expect(html).toContain('Two.');
    expect(html.match(/border-bottom:1px solid #E4DCD3/g)).toHaveLength(1);
  });

  it('shrinks the padding and widens the button on a phone, so nothing scrolls sideways', () => {
    const html = renderEmailHtml('en', confirmation(), brand);
    expect(html).toContain('@media (max-width:480px)');
    expect(html).toContain('.email-button{width:100%!important}');
    expect(html).toContain('word-break:break-all');
  });
});

describe('lines with a link', () => {
  it('make the words before a closing link the link itself', () => {
    const html = linkedLineHtml({
      text: `Stop these emails with one click: ${LINK_MARKER}`,
      url: 'https://product.test/unsubscribe?key=k',
    });
    expect(html).toBe(
      '<a href="https://product.test/unsubscribe?key=k" style="color:#3D4290">Stop these emails with one click</a>',
    );
  });

  it('show the address when the link sits inside a sentence', () => {
    const html = linkedLineHtml({ text: `See ${LINK_MARKER} today.`, url: 'https://p.test/a' });
    expect(html).toContain('See <a href="https://p.test/a"');
    expect(html).toContain('>https://p.test/a</a> today.');
  });

  it('stay plain words without a link', () => {
    expect(linkedLineHtml({ text: 'We always send this one.' })).toBe('We always send this one.');
  });

  it('give a button its label from the words before the link', () => {
    expect(wordsBeforeLink(`Log in to keep it: ${LINK_MARKER}`)).toBe('Log in to keep it');
    expect(wordsBeforeLink(`Go to ${LINK_MARKER} now`)).toBeNull();
  });
});
