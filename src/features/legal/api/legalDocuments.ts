/**
 * Reads legal documents and records acceptances (story S1-E14-01).
 *
 * Who calls it: the hooks in src/features/legal/hooks/.
 * What it calls next: Supabase.
 * - Reading versions goes to public.legal_document_versions through the policy
 *   legal_document_versions_select_published: anyone, signed out included, reads live versions.
 * - The signed-in person's waiting documents come from my_legal_documents_to_accept(), and
 *   accepting goes through accept_current_legal_versions()
 *   (supabase/migrations/…_s1_e14_01_legal_gate.sql). Both only ever touch the caller's own rows.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

/** One published version of a document, in one language (generated type, CLAUDE.md rule 14). */
export type LegalVersion = Pick<
  Database['public']['Tables']['legal_document_versions']['Row'],
  | 'id'
  | 'version_label'
  | 'language'
  | 'title'
  | 'body_markdown'
  | 'change_summary'
  | 'is_lawyer_reviewed'
  | 'published_at'
>;

/** A document the signed-in person still has to accept. */
export type DocumentToAccept =
  Database['public']['Functions']['my_legal_documents_to_accept']['Returns'][number];

/**
 * Reads every live version of one document, newest first, in every language.
 *
 * @param client - the shared Supabase client
 * @param documentSlug - for example 'terms'
 * @returns the versions (an empty list when the document doesn't exist)
 * Errors: throws with Supabase's message when the database can't be reached; the page shows a
 *   plain "couldn't load" message and a way to try again.
 */
export async function fetchLegalVersions(
  client: AppSupabaseClient,
  documentSlug: string,
): Promise<LegalVersion[]> {
  // The join keeps only versions of the named document; the policy hides versions not live yet.
  const { data, error } = await client
    .from('legal_document_versions')
    .select(
      'id, version_label, language, title, body_markdown, change_summary, is_lawyer_reviewed, published_at, legal_documents!inner(slug)',
    )
    .eq('legal_documents.slug', documentSlug)
    .order('published_at', { ascending: false });
  if (error !== null) throw new Error(`Could not read the legal document: ${error.message}`);
  // Keep the version's own columns; the joined document was only needed to filter by slug.
  return data.map((row) => ({
    id: row.id,
    version_label: row.version_label,
    language: row.language,
    title: row.title,
    body_markdown: row.body_markdown,
    change_summary: row.change_summary,
    is_lawyer_reviewed: row.is_lawyer_reviewed,
    published_at: row.published_at,
  }));
}

/**
 * Lists the documents the signed-in person still has to accept.
 *
 * @param client - the shared Supabase client
 * @returns the documents waiting, in the Legal centre's order (none when signed out)
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchDocumentsToAccept(
  client: AppSupabaseClient,
): Promise<DocumentToAccept[]> {
  const { data, error } = await client.rpc('my_legal_documents_to_accept');
  if (error !== null) throw new Error(`Could not check the legal documents: ${error.message}`);
  return data;
}

/**
 * Records that the signed-in person accepts the current versions of these documents.
 *
 * @param client - the shared Supabase client
 * @param documentSlugs - for example ['terms']
 * @param readingLanguage - the interface language, so the record names the version they read
 * Errors: throws when the database refuses (for example the session ended) or can't be reached;
 *   the notice then says it didn't work and offers to try again.
 */
export async function acceptDocuments(
  client: AppSupabaseClient,
  documentSlugs: string[],
  readingLanguage: string,
): Promise<void> {
  const { error } = await client.rpc('accept_current_legal_versions', {
    document_slugs: documentSlugs,
    reading_language: readingLanguage,
  });
  if (error !== null) throw new Error(`Could not record the acceptance: ${error.message}`);
}
