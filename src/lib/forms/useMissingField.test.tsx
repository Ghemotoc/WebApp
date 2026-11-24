/**
 * Tests for useMissingField (design books item 9): a member form says what is missing on press,
 * instead of greying out its button.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

import { useMissingField } from './useMissingField';

/** A small form like the member forms: one required box and a Send button. */
function SampleForm({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const missing = useMissingField(text.trim() === '', 'sample');

  /** Sends only when the box has words. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!missing.isReadyToSend()) return;
    onSend(text);
  }

  return (
    <form onSubmit={submit}>
      <Textarea
        id="sample"
        label="Your reply"
        value={text}
        onChange={(event) => setText(event.target.value)}
        errorMessage={missing.isShown ? 'Write your reply first.' : undefined}
      />
      <Button type="submit">Send</Button>
    </form>
  );
}

describe('useMissingField', () => {
  it('keeps the button pressable while the form is empty', () => {
    render(<SampleForm onSend={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('says what is missing beside the field and moves the focus there on press', () => {
    const onSend = vi.fn();
    render(<SampleForm onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    const box = screen.getByLabelText('Your reply');
    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveFocus();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Write your reply first.');
  });

  it('takes the message away once the field is filled, and then sends', () => {
    const onSend = vi.fn();
    render(<SampleForm onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    fireEvent.change(screen.getByLabelText('Your reply'), { target: { value: 'Hello' } });
    expect(screen.queryByText('Write your reply first.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledWith('Hello');
  });
});
