/**
 * SignatureBody: a forum signature's picture and words (story S1-E8-08; board 6.1's "Forum
 * signature" box and board 5.2's signature line under a post).
 *
 * Two sizes: "card" is the profile's box (a 56 px picture beside 15 px words on the paper tint,
 * 16 px corners, as board 6.1 draws it); "post" is the quieter line under a post (a 40 px picture
 * and 13 px words in the meta colour, after a dashed rule). The words keep their line breaks
 * (white-space: pre-line) and are plain text: nothing in them becomes a link (proposal, see the
 * pull request). The picture shows only once its check passed; the database sends no file
 * otherwise, so nothing is drawn (CLAUDE.md rule 19).
 * Who uses it: ProfileSignatureCard, ForumPostCard and SignatureSettingsSection (the preview).
 * What it calls: useSignaturePictureView for the picture's signed address.
 */
import type { ForumSignature } from '../api/forumSignatures';
import { useSignaturePictureView } from '../hooks/useForumSignatures';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the signature needs. */
export interface SignatureBodyProps {
  signature: ForumSignature;
  /** Whose it is, for the picture's description ("inkwolf’s signature picture"). */
  name: string;
  size: 'card' | 'post';
}

/**
 * The picture, once it has a signed address.
 *
 * @returns the picture, or nothing
 */
function SignaturePicture({ signature, name, size }: SignatureBodyProps) {
  const { t } = useForumsTranslation();
  const view = useSignaturePictureView(signature.picture).data ?? null;
  if (view?.url == null) return null;
  const sizeClass = size === 'card' ? 'size-14 rounded-xl' : 'size-10 rounded-lg';
  return (
    <img
      src={view.url}
      alt={t('signature.pictureAlt', { name })}
      className={`${sizeClass} shrink-0 border border-border object-cover`}
    />
  );
}

/**
 * Renders the signature.
 *
 * @returns the picture and the words
 */
export function SignatureBody(props: SignatureBodyProps) {
  const { signature, size } = props;
  const textClass =
    size === 'card'
      ? 'text-[15px] leading-[1.55] text-ink'
      : 'text-[13px] leading-normal text-meta';
  const boxClass =
    size === 'card'
      ? 'rounded-2xl border border-border bg-paper p-4'
      : 'border-t border-dashed border-border pt-3';
  return (
    <div className={`flex items-start gap-3.5 ${boxClass}`}>
      <SignaturePicture {...props} />
      {signature.text !== null && (
        <p className={`m-0 min-w-0 break-words whitespace-pre-line ${textClass}`}>
          {signature.text}
        </p>
      )}
    </div>
  );
}
