/**
 * Scans the built app (dist/) for Supabase keys that must never reach a browser
 * (story S1-E1-02; CLAUDE.md rule 2: never use the service role key in client code).
 *
 * Who runs it: `npm run scan:bundle`, after `npm run build`, in the CI "checks" job.
 * What it looks for, in every text file under dist/:
 *   - a JSON web token whose payload says "role": "service_role" (Supabase's older secret key);
 *   - a key starting with "sb_secret_" (Supabase's newer secret keys);
 *   - the name SUPABASE_SERVICE_ROLE_KEY, a sign that server-only code was bundled.
 * The public anon or publishable key is allowed: it is meant for browsers and RLS guards the data.
 * Exits with code 1 and names the file when it finds something.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Anything shaped like a JSON web token: three base64url parts, the first two starting with "eyJ". */
const jsonWebToken = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

/** Supabase's newer secret API keys. */
const secretApiKey = /sb_secret_[A-Za-z0-9_-]{8,}/;

/** The environment variable name only server code should mention. */
const serviceRoleVariableName = /SUPABASE_SERVICE_ROLE_KEY/;

/** File types that can carry text into the browser. */
const scannedExtensions = ['.js', '.mjs', '.css', '.html', '.json', '.map', '.txt'];

/** One secret found in the bundle. */
export interface SecretFinding {
  filePath: string;
  reason: string;
}

/**
 * Says whether a JSON web token's payload grants the service role.
 *
 * @param token - the three-part token text
 * @returns true when the middle part decodes to JSON with role "service_role"
 */
export function isServiceRoleToken(token: string): boolean {
  const payloadPart = token.split('.')[1];
  if (payloadPart === undefined) return false;

  // Decode the payload; a token that isn't valid JSON can't be a Supabase key.
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
      role?: unknown;
    };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

/**
 * Looks for secrets in one file's text.
 *
 * @param text - the file's contents
 * @param filePath - used only to label the findings
 * @returns one finding per kind of secret found
 */
export function findSecretsInText(text: string, filePath: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  if ((text.match(jsonWebToken) ?? []).some(isServiceRoleToken)) {
    findings.push({ filePath, reason: 'a service role JSON web token' });
  }
  if (secretApiKey.test(text)) {
    findings.push({ filePath, reason: 'an sb_secret_ API key' });
  }
  if (serviceRoleVariableName.test(text)) {
    findings.push({ filePath, reason: 'the SUPABASE_SERVICE_ROLE_KEY name' });
  }

  return findings;
}

/**
 * Scans every text file under a folder.
 *
 * @param bundleFolder - absolute path of the built app, usually dist/
 * @returns every finding; an empty list means the bundle is clean
 */
export function scanBundle(bundleFolder: string): SecretFinding[] {
  const entries = readdirSync(bundleFolder, { withFileTypes: true, recursive: true });

  return entries
    .filter((entry) => entry.isFile())
    .filter((entry) => scannedExtensions.some((extension) => entry.name.endsWith(extension)))
    .flatMap((entry) => {
      const absolutePath = join(entry.parentPath, entry.name);
      const text = readFileSync(absolutePath, 'utf8');
      return findSecretsInText(text, relative(bundleFolder, absolutePath));
    });
}

/** Runs the scan from the command line and sets the exit code CI reads. */
function main(): void {
  const bundleFolder = fileURLToPath(new URL('../dist', import.meta.url));

  // A missing dist/ means the build didn't run first; say so plainly.
  let findings: SecretFinding[];
  try {
    findings = scanBundle(bundleFolder);
  } catch (error) {
    console.error(
      `Bundle scan failed: could not read dist/ (run npm run build first). ${String(error)}`,
    );
    process.exitCode = 1;
    return;
  }

  if (findings.length === 0) {
    console.log('Bundle scan passed: no service role key or secret API key in dist/.');
    return;
  }
  console.error(`Bundle scan failed: ${findings.length} secret(s) found in dist/:`);
  for (const finding of findings) console.error(`- ${finding.filePath}: ${finding.reason}`);
  process.exitCode = 1;
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
