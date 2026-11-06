/**
 * NewDataRequestForm: logs a new data request: the person, what they asked for, how it reached us,
 * the date received and a note for the team (bundle ADMIN-2, part c1; story S1-E11-09 criterion 1).
 *
 * Who shows it: NewDataRequestPage. What it calls: useOpenDataRequest → admin_open_data_request(),
 * which sets the deadline one month from the date received and writes the audit log. On success
 * the request's own page opens.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { romaniaNowFields } from '@/lib/romania-time';

import {
  dataRequestChannels,
  dataRequestTypes,
  type DataRequestChannel,
  type DataRequestType,
} from '../../api/dataRequests';
import { useOpenDataRequest } from '../../hooks/useStaffDataRequests';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestPersonPicker } from './DataRequestPersonPicker';
import { errorShownByHook } from '@/lib/errorShownByHook';

/**
 * The form's fields and their setters, starting with a copy asked for by email today.
 *
 * @returns the fields and setters
 */
function useNewRequestFields() {
  const [userId, setUserId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<DataRequestType>('copy');
  const [channel, setChannel] = useState<DataRequestChannel>('email');
  const [receivedOn, setReceivedOn] = useState(() => romaniaNowFields(new Date()).date);
  const [note, setNote] = useState('');
  return {
    values: { userId, requestType, channel, receivedOn, note },
    setUserId,
    setRequestType: (value: string) =>
      setRequestType(dataRequestTypes.find((type) => type === value) ?? 'other'),
    setChannel: (value: string) =>
      setChannel(dataRequestChannels.find((known) => known === value) ?? 'email'),
    setReceivedOn,
    setNote,
  };
}

/** What the two drop-downs need. */
interface RequestKindFieldsProps {
  requestType: DataRequestType;
  channel: DataRequestChannel;
  onTypeChange: (value: string) => void;
  onChannelChange: (value: string) => void;
}

/**
 * The two drop-downs: what the person asked for and how it reached us.
 *
 * @returns the drop-downs
 */
function RequestKindFields({
  requestType,
  channel,
  onTypeChange,
  onChannelChange,
}: RequestKindFieldsProps) {
  const { t } = useDataRequestsTranslation();
  return (
    <>
      <Select
        id="data-request-type"
        label={t('new.type')}
        isLabelVisible
        placement="form"
        value={requestType}
        onChange={onTypeChange}
        options={dataRequestTypes.map((type) => ({ value: type, label: t(`staff.types.${type}`) }))}
      />
      <Select
        id="data-request-channel"
        label={t('new.channel')}
        isLabelVisible
        placement="form"
        value={channel}
        onChange={onChannelChange}
        options={dataRequestChannels.map((known) => ({
          value: known,
          label: t(`staff.channels.${known}`),
        }))}
      />
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function NewDataRequestForm() {
  const { t } = useDataRequestsTranslation();
  const navigate = useNavigate();
  const fields = useNewRequestFields();
  const opening = useOpenDataRequest();
  const [needsPerson, setNeedsPerson] = useState(false);
  const { userId, requestType, channel, receivedOn, note } = fields.values;

  /** Sends the request; without a picked person it says so instead. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (userId === null) {
      setNeedsPerson(true);
      return;
    }
    setNeedsPerson(false);
    opening
      .open({ userId, requestType, channel, receivedOn, note })
      .then((made) => navigate(`/staff/data-requests/${made.id}`))
      // The failure is shown from opening.failure below.
      .catch(errorShownByHook);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <DataRequestPersonPicker pickedUserId={userId} onPick={fields.setUserId} />
      <RequestKindFields
        requestType={requestType}
        channel={channel}
        onTypeChange={fields.setRequestType}
        onChannelChange={fields.setChannel}
      />
      <TextInput
        id="data-request-received"
        type="date"
        label={t('new.received')}
        hint={t('new.receivedHint')}
        value={receivedOn}
        onChange={(event) => fields.setReceivedOn(event.target.value)}
        className="max-w-[220px]"
      />
      <Textarea
        id="data-request-note"
        label={t('new.note')}
        hint={t('new.noteHint')}
        value={note}
        maxLength={2000}
        onChange={(event) => fields.setNote(event.target.value)}
      />
      {needsPerson && <Notice tone="error">{t('new.pickFirst')}</Notice>}
      {opening.failure !== null && <Notice tone="error">{t(`failures.${opening.failure}`)}</Notice>}
      <Button type="submit" className="self-start" disabled={opening.isOpening}>
        {t('new.submit')}
      </Button>
    </form>
  );
}
