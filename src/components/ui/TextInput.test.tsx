/**
 * Tests for the shared text fields correcting Romanian letters as they are typed
 * (story S1-E1-04; CLAUDE.md rule 4: cedilla forms are normalised on input).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchInput } from './SearchInput';
import { Textarea } from './Textarea';
import { TextInput } from './TextInput';

describe('the shared text fields', () => {
  it('turn a typed ş or ţ into ș or ț before the form sees the value', () => {
    const handleChange = vi.fn((event: { target: { value: string } }) => event.target.value);
    render(<TextInput id="title" label="Title" onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Ştiinţă' } });

    expect(handleChange).toHaveReturnedWith('Știință');
  });

  it('do the same in a multi-line field and in search', () => {
    render(
      <>
        <Textarea id="comment" label="Comment" />
        <SearchInput id="search" label="Search" />
      </>,
    );

    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'ţară' } });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ştiri' } });

    expect(screen.getByLabelText('Comment')).toHaveValue('țară');
    expect(screen.getByLabelText('Search')).toHaveValue('știri');
  });
});
