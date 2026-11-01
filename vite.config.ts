/**
 * Build, dev server and unit test settings (story S1-E1-01).
 *
 * Who reads it: `npm run dev` and `npm run build` (Vite), `npm test` (Vitest) and Cloudflare Pages,
 * which runs `npm run build` and publishes the `dist` folder (decided 17 Oct 2026, 12:57).
 * What it does next: compiles src/main.tsx and everything it imports into dist/, fills the page
 * title in index.html from src/config/brand.ts, and serves our Cloudflare Pages Functions
 * (functions/) during development and preview (server/pages-functions-plugin.ts, S1-E2-01).
 */
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import { pagesFunctionsPlugin } from './server/pages-functions-plugin.ts';
import { readBrand } from './src/config/brand.ts';

/**
 * The version an error report names (S1-E1-05): the first seven characters of the commit
 * Cloudflare Pages is building (it sets CF_PAGES_COMMIT_SHA), or "local" anywhere else.
 *
 * @returns for example "a1b2c3d"
 */
function appVersion(): string {
  const commit = process.env.CF_PAGES_COMMIT_SHA ?? '';
  return commit === '' ? 'local' : commit.slice(0, 7);
}

/**
 * A small Vite plugin that swaps %BRAND_PRODUCT_NAME% in index.html for the product name,
 * so the name lives only in the brand config (CLAUDE.md: names are settings, not code).
 *
 * @param productName - the name from readBrand()
 * @returns the plugin for Vite's plugin list
 */
function brandTitlePlugin(productName: string): Plugin {
  return {
    name: 'brand-title',
    transformIndexHtml: (html) => html.replaceAll('%BRAND_PRODUCT_NAME%', productName),
  };
}

export default defineConfig(({ mode }) => {
  // Read the VITE_ variables for this mode (from .env files and the shell), as the app will see them.
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  const brand = readBrand(environment);

  return {
    // pagesFunctionsPlugin serves functions/ (Cloudflare Pages Functions) locally (S1-E2-01).
    plugins: [react(), tailwindcss(), brandTitlePlugin(brand.productName), pagesFunctionsPlugin()],
    // The build's version, read by src/config/appVersion.ts for error reports (S1-E1-05).
    define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion()) },
    resolve: {
      // "@/..." means "src/...", so imports don't need long ../../ chains.
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      // Cloudflare Pages publishes this folder; keep it in step with the Pages project settings.
      outDir: 'dist',
    },
    test: {
      projects: [
        {
          // App code (src/) runs in a simulated browser (jsdom), like it does for real readers.
          extends: true,
          test: {
            name: 'app',
            environment: 'jsdom',
            setupFiles: ['./src/test/setup.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
          },
        },
        {
          // Repository checks (scripts/), server code and Edge Function logic run in plain Node.
          extends: true,
          test: {
            name: 'scripts',
            environment: 'node',
            include: [
              'scripts/**/*.test.ts',
              'server/**/*.test.ts',
              'supabase/functions/**/*.test.ts',
            ],
          },
        },
      ],
    },
  };
});
