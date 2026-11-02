import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../src/${p}`, import.meta.url));

// A dev server for the stress harness only. It never ships: the production
// build has one entry, index.html at the repository root, and this
// directory is outside it, outside eslint's and tsc's globs, and outside
// Tailwind's content globs (the harness chrome is styled inline).
//
// The alias is the whole trick: the panel imports the catalog by path, so
// replacing that one module hands it a catalog of any size without touching
// a line of the component.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^.*\/techniqueCatalog(\.js)?$/,
        replacement: fileURLToPath(new URL('./stressCatalog.js', import.meta.url)),
      },
      { find: '@', replacement: src('').replace(/\/$/, '') },
    ],
  },
});
