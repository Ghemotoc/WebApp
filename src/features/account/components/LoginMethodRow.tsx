/**
 * LoginMethodRow: one way to log in in Settings › Ways to log in (story S1-E2-09; board 6.3,
 * "Ways to log in").
 *
 * Shows the way's logo or doodle icon, its name and a short detail, a Connected or Not connected
 * pill and, when there is one, its button (Connect, Disconnect, "Add a passkey", "Set a password").
 * A Disconnect that would remove the last way in is disabled and points at the note that says why
 * (aria-describedby), as the board does.
 * Who shows it: LoginMethodsSection.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';

/** The row's button, when it has one. */
export interface LoginMethodAction {
  label: string;
  /** The accessible name when the label alone doesn't say which way ("Disconnect Google"). */
  accessibleName: string;
  onPress: () => void;
  /** Disconnecting is a removal, so it is drawn as one. */
  isRemoval: boolean;
  /** The ID of the note that explains why the button is disabled, when it is. */
  disabledBecauseOf: string | null;
}

/** What a row needs. */
interface LoginMethodRowProps {
  /** The logo or icon file; drawn without alt text, because the name says the same. */
  iconSource: string;
  name: string;
  detail: string;
  /** Connected or not; null for the "Add another passkey" row, which has no pill. */
  isConnected: boolean | null;
  action: LoginMethodAction | null;
  isBusy: boolean;
}

/**
 * Renders the row.
 *
 * @returns a list item
 */
export function LoginMethodRow(props: LoginMethodRowProps) {
  const { t } = useTranslation('account');
  const { action } = props;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border px-[18px] py-4 first:border-t-0">
      <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white">
        <img src={props.iconSource} alt="" aria-hidden="true" width={22} height={22} />
      </span>
      <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
        <span className="text-[15px] font-bold text-heading">{props.name}</span>
        <span className="text-sm text-meta">{props.detail}</span>
      </span>
      {props.isConnected !== null && (
        <InfoPill tone={props.isConnected ? 'sage' : 'neutral'}>
          {props.isConnected ? t('loginMethods.connected') : t('loginMethods.notConnected')}
        </InfoPill>
      )}
      {action !== null && (
        <Button
          variant={action.isRemoval ? 'destructive' : 'secondary'}
          className="min-w-[132px]"
          aria-label={action.accessibleName}
          aria-describedby={action.disabledBecauseOf ?? undefined}
          disabled={props.isBusy || action.disabledBecauseOf !== null}
          onClick={action.onPress}
        >
          {action.label}
        </Button>
      )}
    </li>
  );
}
