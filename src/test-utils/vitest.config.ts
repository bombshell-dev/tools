import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude, 'dist/**'],
		// oxlint/knip spawn real binaries in integration tests; 5s is not
		// enough headroom on a loaded machine.
		testTimeout: 15_000,
		env: {
			FORCE_COLOR: '1',
		},
		snapshotSerializers: [fileURLToPath(import.meta.resolve('vitest-ansi-serializer'))],
	},
});
