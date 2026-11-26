/**
 * Tests for StepWizard and useStepWizard (CALM-9, the long-form wizard of boards D02 and H08).
 */
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { StepWizard, type WizardStep } from './StepWizard';
import { useStepWizard } from './useStepWizard';

/** Three steps: a required one, an optional one and the last one. */
const steps: WizardStep[] = [
  {
    key: 'one',
    title: 'The basics',
    summary: 'The Weather Station · English',
    isOptional: false,
    content: <p>Basics fields</p>,
  },
  {
    key: 'two',
    title: 'Cover',
    summary: 'Automatic cover',
    isOptional: true,
    content: <p>Cover fields</p>,
  },
  { key: 'three', title: 'Labels', summary: '', isOptional: false, content: <p>Label fields</p> },
];

/** The wizard with its own place, as a page uses it. */
function Harness() {
  const wizard = useStepWizard(steps.length);
  return (
    <StepWizard
      label="Steps to start a story"
      steps={steps}
      openIndex={wizard.openIndex}
      furthestIndex={wizard.furthestIndex}
      onOpenStep={wizard.openStep}
      onNext={wizard.goToNextStep}
      onSkip={wizard.goToNextStep}
      onBack={wizard.goToPreviousStep}
      lastStepActions={
        <button type="button" onClick={wizard.finish}>
          Create
        </button>
      }
    />
  );
}

describe('StepWizard', () => {
  it('opens the first step and shows later steps by title only', () => {
    renderWithProviders(<Harness />, 'en');
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Basics fields')).toBeInTheDocument();
    expect(screen.queryByText('Cover fields')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cover' })).toBeInTheDocument();
    // A required step has no Skip.
    expect(screen.queryByRole('button', { name: 'Skip this step' })).not.toBeInTheDocument();
  });

  it('moves on with Next, folds the done step to its summary and focuses the new step', () => {
    renderWithProviders(<Harness />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Next: cover' }));
    expect(screen.getByText('The Weather Station · English')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cover' })).toHaveFocus();
    expect(screen.getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
  });

  it('skips an optional step and reopens a done step with Change', () => {
    renderWithProviders(<Harness />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Next: cover' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change The basics' }));
    expect(screen.getByText('Basics fields')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
    // The step reached before stays done, with its own Change button.
    expect(screen.getByRole('button', { name: 'Change Cover' })).toBeInTheDocument();
  });

  it('folds every step as done after finish, and Change opens one again', () => {
    renderWithProviders(<Harness />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Next: cover' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: labels' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    // No step is open: each one shows its Change button instead of its fields.
    expect(screen.queryByText('Label fields')).not.toBeInTheDocument();
    for (const listItem of screen.getAllByRole('listitem')) {
      expect(listItem).not.toHaveAttribute('aria-current');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Change Labels' }));
    expect(screen.getByText('Label fields')).toBeInTheDocument();
  });
});
