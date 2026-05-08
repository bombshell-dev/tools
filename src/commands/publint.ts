import { publint } from 'publint';
import { printViolations } from './lint.ts';

export async function publintCommand() {
	const result = await publint({ strict: true });
	const violations = result.messages.map((m) => ({
		tool: 'publint' as const,
		level: m.type,
		code: m.code,
		message: m.code,
		file: 'package.json',
		line: undefined,
		column: undefined,
	}));

	printViolations(violations);
	if (violations.some((v) => v.level === 'error')) {
		process.exit(1);
	}
}
