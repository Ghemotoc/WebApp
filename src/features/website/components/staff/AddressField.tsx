/**
 * AddressField: the web address (entry key) of a new help page or question (story S1-E11-12).
 *
 * Shown only while an entry is new: once an address is used it never changes, so links to it keep
 * working. The text is lower-cased as it is typed; the database checks the pattern when saving.
 * Who shows it: HelpPageForm and QuestionForm.
 */
import { TextInput } from '@/components/ui/TextInput';

/** What the field needs. */
export interface AddressFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Renders the address field.
 *
 * @returns the field, at most 420 px wide
 */
export function AddressField({ id, label, hint, value, onChange }: AddressFieldProps) {
  return (
    <div className="max-w-[420px]">
      <TextInput
        id={id}
        label={label}
        hint={hint}
        value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
      />
    </div>
  );
}
