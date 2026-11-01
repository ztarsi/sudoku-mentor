import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true
    }),
    react(),
  ],
  // The manifest lets CI budget what loads before the first board
  // (scripts/bundle-budget.mjs, #91). It would land in dist/.vite/ and be
  // served with the app, so it is written only when CI asks for it.
  build: {
    manifest: process.env.BUNDLE_BUDGET === '1',
  },
});