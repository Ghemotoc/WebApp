/**
 * ClassInviteFields: "Works for" and "Places" for a class's new invite code (bundle CLASSES,
 * part a; story S1-E8-11 criterion 4: the code stops after the period the teacher sets).
 *
 * "Works for" is a drop-down of 7, 14 and 30 days, a term (90 days) or a school year (365 days);
 * "Places" is how many people may join with it, 1 to 200 (40 by default, a proposal). The database
 * checks the same limits (make_class_invite()). Who shows it: ClassInviteCard.
 */
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The periods a teacher can pick, in days. */
const classInviteDays = ['7', '14', '30', '90', '365'];

/** What the two fields hold while the card is open. */
export interface ClassInviteValues {
  validDays: string;
  admits: string;
}

/**
 * Renders the two fields side by side (stacked on phones).
 *
 * @param props.values - what is chosen
 * @param props.onChange - the new values
 * @returns the fields
 */
export function ClassInviteFields({
  values,
  onChange,
}: {
  values: ClassInviteValues;
  onChange: (values: ClassInviteValues) => void;
}) {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex flex-col gap-1.5">
        <Select
          id="class-invite-days"
          label={t('classInvite.worksFor')}
          isLabelVisible
          options={classInviteDays.map((days) => ({
            value: days,
            label: t(`classInvite.days.${days}`),
          }))}
          value={values.validDays}
          onChange={(validDays) => onChange({ ...values, validDays })}
        />
      </div>
      <TextInput
        id="class-invite-admits"
        type="number"
        min={1}
        max={200}
        inputMode="numeric"
        label={t('classInvite.places')}
        hint={t('classInvite.placesHint')}
        value={values.admits}
        onChange={(event) => onChange({ ...values, admits: event.target.value })}
      />
    </div>
  );
}
