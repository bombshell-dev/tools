export const devEngines = {
	runtime: {
		name: "node",
		version: "22.14.0",
		onFail: "error" as const,
	},
	packageManager: {
		name: "pnpm",
		version: "10.7.0",
		onFail: "error" as const,
	},
};
