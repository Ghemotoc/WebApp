/**
 * Tests for the Audit log rows' long values (story S1-E11-01; UX-QA look-back): a value as long
 * as a landing page's whole content shows its start and a "Show all" toggle, so it can't squeeze
 * the other columns, while a short value shows whole.
 */
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { createI18n } from '@/lib/i18n';

import type { AuditLogEntry } from '../api/auditLog';

import { AuditLogTable } from './AuditLogTable';

/** One audit entry with the given after values. */
function entryWith(afterValues: AuditLogEntry['afterValues']): AuditLogEntry {
  return {
    id: 'entry-1',
    createdAt: '2026-11-11T08:00:00Z',
    actor: 'person',
    staffHandle: 'admin',
    actorUserIdShort: null,
    action: 'landing_page.published',
    targetType: 'landing_pages',
    targetId: null,
    targetHandle: null,
    targetUserIdShort: null,
    reason: null,
    beforeValues: null,
    afterValues,
  };
}

/** Draws the rows in English. */
function renderRows(entry: AuditLogEntry) {
  return render(
    <I18nextProvider i18n={createI18n('en')}>
      <AuditLogTable entries={[entry]} />
    </I18nextProvider>,
  );
}

describe('the audit log rows', () => {
  it('show a short value whole, with no toggle', () => {
    const { container } = renderRows(entryWith({ slug: 'spring-contest' }));
    expect(screen.getAllByText('slug: spring-contest').length).toBeGreaterThan(0);
    expect(container.querySelector('summary')).toBeNull();
  });

  it('show the start of a very long value and a Show all toggle that holds the rest', () => {
    const longContent = 'a'.repeat(5000);
    const { container } = renderRows(entryWith({ content: longContent }));
    const toggle = container.querySelector('summary');
    // The toggle's own words are short; the whole value is still there once opened.
    expect(toggle?.textContent?.length).toBeLessThan(300);
    expect(screen.getAllByText(`content: ${longContent}`).length).toBeGreaterThan(0);
  });
});
