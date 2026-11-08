/**
 * Tests for the shared Button (story S1-E1-03; restyled in bundle G3 COMPONENTS).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('never submits a form by accident: its type is "button" unless asked', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('draws the main action with the accent gradient and an add action in grey glass', () => {
    render(
      <>
        <Button>Publish</Button>
        <Button variant="secondary">New story</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveClass('button-main', 'h-11');
    expect(screen.getByRole('button', { name: 'New story' })).toHaveClass('button-glass');
  });

  it('keeps its label, shows a spinner and refuses a second click while it is loading', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button isLoading onClick={onClick}>
        Publish
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Publish' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('[data-button-spinner]')).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has no spinner and no busy state when it is not loading', () => {
    const { container } = render(<Button>Publish</Button>);
    const button = screen.getByRole('button', { name: 'Publish' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(container.querySelector('[data-button-spinner]')).toBeNull();
  });
});
