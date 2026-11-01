/**
 * Supabase Edge Function storage-sweep: deletes the Storage files no row points at any more
 * (story S1-E13-04). The logic is in sweep.ts, shared with the tests.
 *
 * The database calls it every night (run_storage_sweep(), job run-storage-sweep, through pg_net)
 * with the sweep key. Supabase gives every Edge Function SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY; STORAGE_SWEEP_KEY is set by hand (GO-LIVE list):
 * `npx supabase secrets set STORAGE_SWEEP_KEY=…`, the same value as the Vault secret
 * storage_sweep_key, and the function's address goes in the Vault secret storage_sweep_url.
 * Deployed with `npx supabase functions deploy storage-sweep --no-verify-jwt` (the sweep key is
 * the check, not a user's session).
 */
import { handleStorageSweep } from './sweep.ts';

/** The parts of Deno's global this file uses (declared here so the repository's type check reads it). */
declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response>) => void;
  env: { get: (name: string) => string | undefined };
};

Deno.serve((request) =>
  handleStorageSweep(request, {
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    sweepKey: Deno.env.get('STORAGE_SWEEP_KEY'),
  }),
);
