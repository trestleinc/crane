import { defineConfig } from '@rslib/core';
import { pluginEslint } from '@rsbuild/plugin-eslint';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

export default defineConfig({
  plugins: [
    pluginTypeCheck(),
    pluginEslint({
      enable: true,
      eslintPluginOptions: {
        configType: 'flat',
        fix: true,
        cacheLocation: 'node_modules/.cache/eslint',
      },
    }),
  ],
  lib: [
    {
      // Shared types - types-only module safe for any environment
      id: 'shared',
      format: 'esm',
      syntax: 'es2022',
      dts: true,
      output: {
        distPath: {
          root: './dist',
        },
      },
      source: {
        entry: {
          shared: './src/shared/index.ts',
        },
      },
    },
    {
      // Client code - BUNDLED (default mode)
      // Single file entry bundles all imports into dist/index.js
      id: 'client',
      format: 'esm',
      syntax: 'es2022',
      dts: true,
      shims: {
        esm: {
          __dirname: true,
          __filename: true,
        },
      },
      output: {
        distPath: {
          root: './dist',
        },
        externals: [
          'yjs',
          '@tanstack/offline-transactions',
          '@tanstack/db',
          'convex/browser',
          'convex/server',
          'convex/values',
          '@logtape/logtape',
        ],
      },
      source: {
        entry: {
          index: './src/client/index.ts', // ← Simple file entry (bundled)
        },
      },
    },
    {
      // Server (Convex user space) - BUNDLED
      // NO Node.js dependencies - runs in Convex runtime
      id: 'server',
      format: 'esm',
      syntax: 'es2022',
      dts: true,
      shims: {
        esm: {
          __dirname: true,
          __filename: true,
        },
      },
      output: {
        distPath: {
          root: './dist',
        },
        externals: ['convex/server', 'convex/values'],
      },
      source: {
        entry: {
          server: './src/server/index.ts',
        },
      },
    },
    {
      // Handler (Node.js API endpoints) - BUNDLED
      // HAS Node.js dependencies - runs in framework server (TanStack, Next, etc)
      id: 'handler',
      format: 'esm',
      syntax: 'es2022',
      dts: true,
      shims: {
        esm: {
          __dirname: true,
          __filename: true,
        },
      },
      output: {
        distPath: {
          root: './dist',
        },
        externals: ['@browserbasehq/stagehand', 'convex/server', 'convex/values'],
      },
      source: {
        entry: {
          handler: './src/handler/index.ts',
        },
      },
    },
    {
      // Component - BUNDLELESS (special case to preserve directory structure)
      // Glob pattern entry preserves entire component/ directory including _generated/
      id: 'component',
      format: 'esm',
      bundle: false, // ← Only component uses bundleless mode
      outBase: './src', // ← Preserves component/ prefix in output
      dts: true,
      output: {
        distPath: {
          root: './dist',
        },
        externals: ['convex/server', 'convex/values'],
      },
      source: {
        entry: {
          'component/index': ['./src/component/**', './src/shared/**'], // Include shared for component imports
        },
      },
    },
  ],
  output: {
    target: 'node',
  },
});
