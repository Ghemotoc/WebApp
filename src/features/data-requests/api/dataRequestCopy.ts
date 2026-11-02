/**
 * Staff › Data requests › a request › The copy: reading the person's data, opening the files,
 * uploading them and sending the copy, and opening one file, logged (bundle ADMIN-2, part c2;
 * story S1-E11-09; GDPR art. 15 and 20; ADR 0012).
 *
 * Who calls it: lib/runDataRequestCopy.ts (building and sending) and hooks/useDataRequestCopy.ts
 * (opening a file).
 * What it calls next: admin_data_request_export(), admin_open_data_request_copy(),
 * admin_finish_data_request_copy() and admin_open_data_request_file() in
 * supabase/migrations/…_admin2_c2_data_request_copy.sql, and the private exports bucket. The
 * database decides who may do each step and logs it; this file only passes the answers on.
 */
import { z } from 'zod';

import {
  EXPORTS_BUCKET,
  exportDownloadAddress,
  type DataExportDocument,
} from '@/features/data-export/api/dataExport';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { dataRequestErrorFrom, DataRequestError } from './dataRequests';

/** One file opened for a copy: where to upload it and the name the person will see. */
export interface OpenedCopyFile {
  exportId: string;
  /** The random name in the exports bucket. */
  fileName: string;
  /** "rain.docx". */
  displayName: string;
}

/** The shape admin_open_data_request_copy() answers. */
const openedFilesSchema = z.array(
  z.object({ export_id: z.string(), file_name: z.string(), display_name: z.string() }),
);

/**
 * Reads everything about the request's person, exactly as Download my data gives it to them.
 * The database logs the read.
 *
 * @param requestId - the request
 * @returns the data file
 * Errors: throws DataRequestError (not_allowed, request_closed, not_a_copy, identity_denied,
 *   identity_not_checked, parent_needed, unreachable).
 */
export async function fetchDataRequestExport(
  client: AppSupabaseClient,
  requestId: string,
): Promise<DataExportDocument> {
  const { data, error } = await client.rpc('admin_data_request_export', {
    target_request_id: requestId,
  });
  if (error !== null) throw dataRequestErrorFrom(error);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new DataRequestError('unreachable');
  }
  // The same document my_data_export() answers, read the same way as Download my data reads it.
  return data as unknown as DataExportDocument;
}

/**
 * Opens one export per file, each under a random name, owned by the person.
 *
 * @param displayNames - the files' names as the person will see them
 * @returns where to upload each file
 * Errors: throws DataRequestError (bad_files and the refusals of fetchDataRequestExport()).
 */
export async function openDataRequestCopy(
  client: AppSupabaseClient,
  requestId: string,
  displayNames: string[],
): Promise<OpenedCopyFile[]> {
  const files: Json = displayNames.map((displayName) => ({ display_name: displayName }));
  const { data, error } = await client.rpc('admin_open_data_request_copy', {
    target_request_id: requestId,
    files,
  });
  if (error !== null) throw dataRequestErrorFrom(error);
  const parsed = openedFilesSchema.safeParse(data);
  if (!parsed.success) throw new DataRequestError('unreachable');
  return parsed.data.map((file) => ({
    exportId: file.export_id,
    fileName: file.file_name,
    displayName: file.display_name,
  }));
}

/**
 * Uploads one built file under its random name.
 *
 * @param fileType - the file's media type (ZIP, Word, JSON or CSV)
 * Errors: throws DataRequestError('no_file') when Storage refuses it.
 */
export async function uploadDataRequestFile(
  client: AppSupabaseClient,
  fileName: string,
  bytes: Uint8Array,
  fileType: string,
): Promise<void> {
  const { error } = await client.storage
    .from(EXPORTS_BUCKET)
    .upload(fileName, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: fileType }), {
      contentType: fileType,
      upsert: false,
    });
  if (error !== null) {
    console.warn(`A data request file wasn't saved: ${error.message}`);
    throw new DataRequestError('no_file');
  }
}

/**
 * Marks the uploaded files ready for seven days and tells the person.
 *
 * Errors: throws DataRequestError (not_found, no_file and the refusals above).
 */
export async function finishDataRequestCopy(
  client: AppSupabaseClient,
  requestId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_finish_data_request_copy', {
    target_request_id: requestId,
  });
  if (error !== null) throw dataRequestErrorFrom(error);
}

/**
 * Opens one file: the database logs it first, then Storage gives this staff member a one-minute
 * address for it.
 *
 * @param exportId - the file
 * @param displayName - the name the browser saves it under
 * @returns the address
 * Errors: throws DataRequestError (not_allowed, not_found, unreachable).
 */
export async function openDataRequestFileAddress(
  client: AppSupabaseClient,
  requestId: string,
  exportId: string,
  displayName: string,
): Promise<string> {
  const { data, error } = await client.rpc('admin_open_data_request_file', {
    target_request_id: requestId,
    target_export_id: exportId,
  });
  if (error !== null) throw dataRequestErrorFrom(error);
  try {
    return await exportDownloadAddress(client, data, displayName);
  } catch (storageError) {
    console.warn(`A data request file couldn't be opened: ${String(storageError)}`);
    throw new DataRequestError('unreachable');
  }
}
