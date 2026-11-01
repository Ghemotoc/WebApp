/**
 * ForumAdminRow: one category, forum or subforum on the staff page: its name, level, address and
 * pin, with Change, Add a forum inside and Remove (bundle FORUMS-1, part a; S1-E8-01).
 *
 * Who shows it: ForumsAdminPage, in tree order, indented by level. What it calls: ForumForm and
 * RemoveForumForm, which call the page's act(). Only one form is open in a row at a time.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { cn } from '@/lib/utils';

import type { StaffForum } from '../../api/forumAdmin';
import type { ForumAdmin } from '../../hooks/useForumAdmin';
import { staffForumName, startingValues } from '../../lib/forumForm';

import { ForumForm } from './ForumForm';
import { RemoveForumForm } from './RemoveForumForm';

/** Which form the row has open. */
type OpenForm = 'none' | 'change' | 'addInside' | 'remove';

/** What a row needs. */
interface ForumAdminRowProps {
  forum: StaffForum;
  forums: StaffForum[];
  admin: ForumAdmin;
}

/** The indent for each level, so subforums sit under their forum. */
const indents = ['', 'md:ml-8', 'md:ml-16'];

/**
 * The row's buttons.
 *
 * @returns Change, Add a forum inside (not for a subforum) and Remove
 */
function RowButtons({
  forum,
  name,
  onOpen,
}: {
  forum: StaffForum;
  name: string;
  onOpen: (form: OpenForm) => void;
}) {
  const { t } = useTranslation('forumsAdmin');
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        aria-label={t('changeLabel', { name })}
        onClick={() => onOpen('change')}
      >
        {t('change')}
      </Button>
      {forum.level < 2 && (
        <Button
          variant="secondary"
          aria-label={t('addInsideLabel', { name })}
          onClick={() => onOpen('addInside')}
        >
          {t('addInside')}
        </Button>
      )}
      <Button
        variant="destructive"
        aria-label={t('removeLabel', { name })}
        onClick={() => onOpen('remove')}
      >
        {t('remove')}
      </Button>
    </div>
  );
}

/**
 * Renders the row.
 *
 * @returns a list item with its forms
 */
export function ForumAdminRow({ forum, forums, admin }: ForumAdminRowProps) {
  const { t, i18n } = useTranslation('forumsAdmin');
  const [openForm, setOpenForm] = useState<OpenForm>('none');
  const name = staffForumName(forum, i18n.language);
  const close = () => setOpenForm('none');
  return (
    <li className={cn('flex flex-col gap-3 border-b border-hairline py-4', indents[forum.level])}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 font-heading text-lg font-bold text-heading">{name}</h2>
          <InfoPill tone="neutral">{t(`levels.${forum.level}`)}</InfoPill>
          {forum.isPinned && <InfoPill tone="gold">{t('pinned')}</InfoPill>}
          <span className="text-sm text-meta">/forums/{forum.slug}</span>
        </div>
        <RowButtons forum={forum} name={name} onOpen={setOpenForm} />
      </div>
      {openForm === 'change' && (
        <ForumForm
          formKey={forum.id}
          initial={startingValues(forum, null)}
          forums={forums}
          admin={admin}
          onClose={close}
        />
      )}
      {openForm === 'addInside' && (
        <ForumForm
          formKey="new"
          initial={startingValues(null, forum.id)}
          forums={forums}
          admin={admin}
          onClose={close}
        />
      )}
      {openForm === 'remove' && (
        <RemoveForumForm forumId={forum.id} admin={admin} onClose={close} />
      )}
    </li>
  );
}
