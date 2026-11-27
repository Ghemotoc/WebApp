/**
 * Unit tests for the branded layout of the emails written as lines of text (S1-E11-19; the
 * Emails page of the member design file).
 */
import { describe, expect, it } from 'vitest';

import {
  letterBrand,
  letterContent,
  letterEmail,
  withLetterLayout,
  type Letter,
} from './letter-email';

const brand = letterBrand({
  productName: 'App',
  companyName: 'Company',
  supportEmail: 'hello@example.test',
  siteUrl: 'https://site.test',
  companySiteUrl: 'https://company.test',
});

/** A letter with any field changed. */
function letter(changes: Partial<Letter> = {}): Letter {
  return {
    to: 'parent@example.test',
    subject: 'Please confirm',
    language: 'en',
    lines: [
      'Someone asked for this.',
      'Confirm here: https://site.test/confirm#token',
      'The link works for 7 days.',
    ],
    signOff: 'The App team',
    madeBy: 'An app by Company',
    pasteLabel: 'Or paste this link into your browser:',
    brand,
    ...changes,
  };
}

describe('letters in the branded layout', () => {
  it('keeps the plain text exactly as the email always sent it', () => {
    const email = letterEmail(letter());
    expect(email.text).toBe(
      'Someone asked for this.\n\nConfirm here: https://site.test/confirm#token\n\nThe link works for 7 days.\n\nThe App team\n\nAn app by Company',
    );
  });

  it('the line with the link becomes the one button, and the words keep their order', () => {
    const content = letterContent(letter());
    expect(content.heading).toBe('Please confirm');
    expect(content.paragraphs).toEqual(['Someone asked for this.']);
    expect(content.action).toEqual({
      label: 'Confirm here',
      url: 'https://site.test/confirm#token',
      pasteLabel: 'Or paste this link into your browser:',
    });
    expect(content.afterAction).toEqual(['The link works for 7 days.']);
  });

  it('draws the logo from the site, the button and the company link in the footer', () => {
    const html = letterEmail(letter()).html ?? '';
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('https://site.test/brand/email-logo.png');
    expect(html).toContain('href="https://site.test/confirm#token"');
    expect(html).toContain('<a href="https://company.test"');
    // The words after the button come after it in the card.
    expect(html.indexOf('The link works')).toBeGreaterThan(html.indexOf('Confirm here'));
  });

  it('a second address in the words becomes a link of its own', () => {
    const html =
      letterEmail(
        letter({ lines: [...letter().lines, 'Leave the list: https://site.test/remove#token.'] }),
      ).html ?? '';
    expect(html).toContain('<a href="https://site.test/remove#token"');
  });

  it('never lets a line carry markup into the email', () => {
    const html = letterEmail(letter({ lines: ['<script>alert(1)</script>'] })).html ?? '';
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('a staff alert without "An app by" keeps its text and has no empty footer line', () => {
    const email = letterEmail(letter({ madeBy: undefined }));
    expect(email.text.endsWith('The App team')).toBe(true);
    expect(email.html).not.toContain('An app by');
  });

  it('an email written in code keeps its text and gets the layout, signed off by its last line', () => {
    const plain = {
      to: 'reporter@example.test',
      subject: 'Our decision on your report (N-123456) · App',
      text: 'Your report N-123456: our decision.\n\nWe removed the content you reported.\n\nThe App team',
    };
    const email = withLetterLayout(plain, 'en', {
      productName: 'App',
      supportEmail: 'hello@example.test',
      siteUrl: 'https://site.test',
      companyName: 'Company',
    });
    expect(email.text).toBe(plain.text);
    expect(email.html).toContain('We removed the content you reported.');
    expect(email.html).toContain('The App team');
    expect(email.html).toContain('An app by');
  });
});
