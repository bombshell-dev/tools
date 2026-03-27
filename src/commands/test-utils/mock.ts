import { onTestFinished, vi } from "vitest";
import { MockReadable, MockWritable } from "./stdio.ts";

type InputConfig = true | ConstructorParameters<typeof MockReadable>[0];
type OutputConfig = true | ConstructorParameters<typeof MockWritable>[0];

export interface CreateMockOptions {
	/** Environment variables to set for the duration of the test. */
	env?: Record<string, string | undefined>;
	/** Pass `true` for defaults, or a config object. Omit to skip. */
	input?: InputConfig;
	/** Pass `true` for defaults, or a config object for columns/rows/isTTY. */
	output?: OutputConfig;
}

export type Mocks<O extends CreateMockOptions = CreateMockOptions> = {
	input: O["input"] extends InputConfig ? MockReadable : undefined;
	output: O["output"] extends OutputConfig ? MockWritable : undefined;
};

/**
 * Create a mock test environment with streams, env vars.
 *
 * Cleanup is automatic via `onTestFinished` — no `beforeAll`/`afterAll` needed.
 *
 * @example
 * ```ts
 * let mocks: Mocks;
 * beforeEach(() => {
 *   mocks = createMocks({ env: { CI: 'true' }});
 * });
 *
 * it('works', () => {
 *   doThing(mocks.input, mocks.output);
 * });
 * ```
 */
export function createMocks<O extends CreateMockOptions>(opts?: O): Mocks<O>;
export function createMocks(opts: CreateMockOptions = {}): Mocks {
	const input = opts.input
		? new MockReadable(typeof opts.input === "object" ? opts.input : undefined)
		: undefined;
	const output = opts.output
		? new MockWritable(typeof opts.output === "object" ? opts.output : undefined)
		: undefined;
	if (opts.env) {
		for (const [key, value] of Object.entries(opts.env)) {
			vi.stubEnv(key, value);
		}
	}

	onTestFinished(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	return { input, output } as Mocks;
}
