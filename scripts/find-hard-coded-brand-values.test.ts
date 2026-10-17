/**
 * The literal-name check (story S1-E1-01).
 * Proves the acceptance criterion: "a test fails if the literal name or the site domain appears in
 * src/ or supabase/ outside the brand config and the locale files" (decided 17 Oct 2026, 12:47).
 * The forbidden values are read from src/config/brand.ts, so this file never types them either.
 */
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { brandDefaults } from '../src/config/brand';

import {
  findBrandValuesInText,
  findHardCodedBrandValues,
  forbiddenBrandValues,
  isAllowedPath,
} from './find-hard-coded-brand-values';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

describe('hard-coded brand values', () => {
  it('appear nowhere in src/, supabase/, public/, e2e/ or index.html outside the brand config and the locale files', () => {
    const findings = findHardCodedBrandValues(repositoryRoot);

    // On failure the list names each file and line, so the fix is easy to find.
    expect(findings).toEqual([]);
  });

  it('would catch the product name typed in a component, whatever its letter case', () => {
    const plantedLine = `<h1>Welcome to ${brandDefaults.productName.toUpperCase()}</h1>`;

    const findings = findBrandValuesInText(plantedLine, 'src/Planted.tsx', forbiddenBrandValues());

    expect(findings).toEqual([
      {
        filePath: 'src/Planted.tsx',
        lineNumber: 1,
        value: brandDefaults.productName.toLowerCase(),
      },
    ]);
  });

  it('would catch the product name used as a ".com" domain in SQL', () => {
    const plantedSql = `select 'https://${brandDefaults.productName.toLowerCase()}.com';`;

    const findings = findBrandValuesInText(plantedSql, 'supabase/seed.sql', forbiddenBrandValues());

    expect(findings).toHaveLength(1);
  });

  it('would catch the contact email address typed in code', () => {
    const plantedLine = `const contact = '${brandDefaults.contactEmail}';`;

    const findings = findBrandValuesInText(plantedLine, 'src/x.ts', forbiddenBrandValues());

    expect(findings.map((finding) => finding.value)).toContain(brandDefaults.contactEmail);
  });

  it('allows only the brand config and the locale files', () => {
    expect(isAllowedPath('src/config/brand.ts')).toBe(true);
    expect(isAllowedPath('src/locales/ro/common.json')).toBe(true);
    expect(isAllowedPath('src/config/brand.test.ts')).toBe(false);
    expect(isAllowedPath('supabase/seed.sql')).toBe(false);
  });
});
