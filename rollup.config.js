import node from '@rollup/plugin-node-resolve';
import tsc from '@rollup/plugin-typescript';
import cjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { defineConfig } from 'rollup';

export default defineConfig({
  input: 'src/index.ts',
  plugins: [
    tsc({
      "compilerOptions": {
        "allowSyntheticDefaultImports": true,
        "resolveJsonModule": true,
        "skipLibCheck": true,
        "moduleResolution": "node",
        "declarationDir": "types",
        "declaration": true,
        "inlineSources": true
      }
    }),
    node({
      "resolveOnly": ["itty-router", "itty-router-extras"],
    }),
    cjs({}),
    json({})
  ],
  output: {
    file: 'dist/worker.js',
    format: 'es',
    compact: true,
    generatedCode: {
      constBindings: true
    }
  }
})
