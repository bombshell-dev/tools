import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import { readFile } from 'node:fs/promises';
import { printViolations } from './lint.ts';

export async function runPublint() {
	const pkg = JSON.parse(await readFile('package.json', 'utf-8'));
	const result = await publint({ strict: true });
	return result.messages.map((m) => ({
		tool: 'publint' as const,
		level: m.type,
		code: m.code,
		message: formatMessage(m, pkg) ?? m.code,
		file: 'package.json',
		line: undefined,
		column: undefined,
	}));
}

export async function publintCommand() {
	const violations = await runPublint();

	printViolations(violations);
	if (violations.some((v) => v.level === 'error')) {
		process.exit(1);
	}
}
