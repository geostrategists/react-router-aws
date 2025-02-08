import { defineConfig } from 'tsup'

export default defineConfig({
  name: 'tsup',
  entry: ['src/index.ts', 'src/vite.ts'],
  target: 'node20',
  format: [
    'cjs',
    'esm'
  ],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'esbuild'
  ]
})
