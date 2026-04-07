import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.js'],
	format: ['esm', 'cjs'],
	outDir: 'dist',
	splitting: false,
	sourcemap: true,
	clean: true,
	dts: false,
})
