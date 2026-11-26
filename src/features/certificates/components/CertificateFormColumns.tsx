/**
 * CertificateFormColumns: the two columns of the teacher's certificates form, the form on the left
 * and the Preview on the right (board G14, bundle BOOKS-8, part 8c: 1.4 to 1 with 64 px between
 * them from 1024 px; one column on phones and tablets, the form first).
 *
 * Who shows it: ClassResultsForm and CompetitionCertificatesForm. What it calls:
 * CertificateLookPreview.
 */
import type { ReactNode } from 'react';

import { CertificateLookPreview, type CertificateLookPreviewProps } from './CertificateLookPreview';

/**
 * Renders the columns.
 *
 * @param props.children - the form's sections and buttons
 * @param props.preview - what the preview shows
 * @returns the grid
 */
export function CertificateFormColumns({
  children,
  preview,
}: {
  children: ReactNode;
  preview: CertificateLookPreviewProps;
}) {
  return (
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
      <div className="flex min-w-0 flex-col gap-8">{children}</div>
      <CertificateLookPreview {...preview} />
    </div>
  );
}
