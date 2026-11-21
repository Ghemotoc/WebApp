/**
 * Tests for the "Report a bug" tab and panel (TRIAL-FEEDBACK; boards J30 to J32).
 * Proves: the tab opens the panel; Send stays off until something is written; a report goes out
 * as a bug report with its kind and the page details; the thank-you line follows; a failure keeps
 * the words and says to try again.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendContactMessage, senderIdentity } from '@/features/contact/api/contact';
import { renderWithProviders } from '@/test/renderWithProviders';

import { BugReportTab } from './BugReportTab';

vi.mock('@/features/contact/api/contact', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/contact/api/contact')>()),
  senderIdentity: vi.fn(),
  sendContactMessage: vi.fn(),
}));

beforeEach(() => {
  // jsdom has no <dialog> methods; these stand in for the browser's.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
  vi.mocked(senderIdentity).mockResolvedValue({
    email: 'lia@example.test',
    handle: 'adult_writer',
    userId: '00000000-0000-4000-8000-000000000001',
  });
});

afterEach(() => vi.mocked(sendContactMessage).mockReset());

/** Opens the panel from the tab. */
async function openPanel() {
  renderWithProviders(<BugReportTab />, 'en');
  fireEvent.click(await screen.findByRole('button', { name: 'Report a bug' }));
  return screen.findByRole('textbox', { name: 'What happened?' });
}

describe('the Report a bug panel', () => {
  it('keeps Send off until something is written', async () => {
    const box = await openPanel();
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send.hasAttribute('disabled')).toBe(true);
    fireEvent.change(box, { target: { value: '   ' } });
    expect(send.hasAttribute('disabled')).toBe(true);
    fireEvent.change(box, { target: { value: 'The Like button does nothing.' } });
    expect(send.hasAttribute('disabled')).toBe(false);
  });

  it('sends a bug report with its kind and the page details, then says thank you', async () => {
    vi.mocked(sendContactMessage).mockResolvedValue({ reference: '#1042' });
    const box = await openPanel();
    fireEvent.click(screen.getByRole('radio', { name: 'An idea' }));
    fireEvent.change(box, { target: { value: 'A dark cover would be nice.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/Thank you\. We have your report/)).toBeTruthy();
    const sent = vi.mocked(sendContactMessage).mock.calls[0]?.[0];
    expect(sent?.topic).toBe('bug_report');
    expect(sent?.bugKind).toBe('idea');
    expect(sent?.handle).toBe('adult_writer');
    expect(sent?.pageContext?.pagePath).toBe(window.location.pathname);
  });

  it('keeps the words and says to try again when sending fails', async () => {
    vi.mocked(sendContactMessage).mockRejectedValue(new Error('down'));
    const box = await openPanel();
    fireEvent.change(box, { target: { value: 'The page went blank.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect((await screen.findByRole('alert')).textContent).toContain('couldn’t send the report');
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: 'What happened?' }) as HTMLTextAreaElement).value,
      ).toBe('The page went blank.'),
    );
  });
});
