/**
 * Build, dev server and unit test settings (story S1-E1-01).
 *
 * Who reads it: `npm run dev` and `npm run build` (Vite), `npm test` (Vitest) and Cloudflare Pages,
 * which runs `npm run build` and publishes the `dist` folder (decided 17 Oct 2026, 12:57).
 * What it does next: compiles src/main.tsx and everything it imports into dist/, fills the page
 * title in index.html from src/config/brand.ts, writes dist/_headers (server/security-headers.ts,
 * QA-1c), shrinks dist/theme-init.js (CONTRAST-1), and serves our Cloudflare Pages Functions
 * (functions/) during development and preview (server/pages-functions-plugin.ts, S1-E2-01).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv, minifySync, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import { pagesFunctionsPlugin } from './server/pages-functions-plugin.ts';
import { cloudflareHeadersFile, securityHeaders } from './server/security-headers.ts';
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

/**
 * A small Vite plugin for the security headers (QA-1c, finding X1): it writes dist/_headers, which
 * Cloudflare Pages sends with every page, and sends the same headers from `vite preview`, so the
 * end-to-end tests (which run against the preview) catch anything the policy would block.
 *
 * @param supabaseUrl - VITE_SUPABASE_URL for this build
 * @returns the plugin for Vite's plugin list
 */
function securityHeadersPlugin(supabaseUrl: string): Plugin {
  const headers = securityHeaders(supabaseUrl);
  return {
    name: 'security-headers',
    // Step 1: at build time, add _headers next to index.html in dist/.
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: cloudflareHeadersFile(supabaseUrl),
      });
    },
    // Step 2: the preview server sends them on every answer. The dev server doesn't: its hot
    // reload needs inline scripts that the policy refuses.
    configurePreviewServer(server) {
      server.middlewares.use((_request, response, next) => {
        for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
        next();
      });
    },
  };
}

/**
 * A small Vite plugin that shrinks dist/theme-init.js after a build (bundle CONTRAST-1).
 *
 * Why: public/theme-init.js runs before the page draws, on every page, and Vite copies files in
 * public/ as they are. Its comments are for developers (CLAUDE.md, Readable code) and were most of
 * what every visitor downloaded: about 3.9 KB written, under 1 KB shrunk. The reader's cold-load
 * script budget (e2e/reader-performance.spec.ts) counts this file too.
 * The source file stays fully commented; the dev server serves it as written.
 *
 * @returns the plugin for Vite's plugin list
 * Errors: fails the build, naming the problem, when the file can't be read or doesn't parse; a
 *   broken first-paint script must never be published quietly.
 */
function shrinkThemeInitPlugin(): Plugin {
  let outputFolder = 'dist';
  return {
    name: 'shrink-theme-init',
    apply: 'build',
    // Step 1: note where this build writes (dist, unless a command says otherwise).
    configResolved(config) {
      outputFolder = join(config.root, config.build.outDir);
    },
    // Step 2: once every file is written, replace the copied file with its shrunk version.
    closeBundle() {
      const filePath = join(outputFolder, 'theme-init.js');
      const shrunk = minifySync('theme-init.js', readFileSync(filePath, 'utf8'));
      if (shrunk.errors.length > 0) {
        throw new Error(`public/theme-init.js could not be shrunk: ${shrunk.errors[0]?.message}`);
      }
      writeFileSync(filePath, shrunk.code);
    },
  };
}

export default defineConfig(({ mode }) => {
  // Read the VITE_ variables for this mode (from .env files and the shell), as the app will see them.
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  const brand = readBrand(environment);

  return {
    // pagesFunctionsPlugin serves functions/ (Cloudflare Pages Functions) locally (S1-E2-01).
    // securityHeadersPlugin writes dist/_headers and sends them from the preview server (QA-1c).
    // shrinkThemeInitPlugin strips the comments from dist/theme-init.js (CONTRAST-1).
    plugins: [
      react(),
      tailwindcss(),
      brandTitlePlugin(brand.productName),
      // Before the functions plugin, so its answers (the /s/ link previews) get the headers too.
      securityHeadersPlugin(environment.VITE_SUPABASE_URL ?? ''),
      pagesFunctionsPlugin(),
      shrinkThemeInitPlugin(),
    ],
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
