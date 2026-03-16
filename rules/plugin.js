/** @type {import("oxlint").Plugin} */
const plugin = {
	meta: {
		name: 'bombshell-dev',
	},
	rules: {
		/**
		 * Disallow `throw new Error(...)` in favor of custom error classes.
		 *
		 * Generic `Error` objects lack structured metadata (error codes, hints, etc.)
		 * and make it harder to provide actionable diagnostics. Use a project-specific
		 * error class instead.
		 *
		 * Catches:
		 *   - `throw new Error(...)`
		 *   - `throw new TypeError(...)` / `throw new RangeError(...)` etc.
		 *
		 * Allows:
		 *   - `throw new MyCustomError(...)` (any non-builtin name)
		 *   - Re-throwing: `throw err`
		 */
		'no-generic-error': {
			create(context) {
				const BUILTIN_ERRORS = new Set([
					'Error',
					'TypeError',
					'RangeError',
					'ReferenceError',
					'SyntaxError',
					'URIError',
					'EvalError',
					'AggregateError',
				]);

				return {
					ThrowStatement(node) {
						const arg = node.argument;
						if (
							arg &&
							arg.type === 'NewExpression' &&
							arg.callee.type === 'Identifier' &&
							BUILTIN_ERRORS.has(arg.callee.name)
						) {
							context.report({
								node: arg,
								message: `Do not throw generic \`${arg.callee.name}\`. Use a project-specific error class with structured metadata instead.`,
							});
						}
					},
				};
			},
		},

		/**
		 * Require JSDoc comments on exported functions and classes.
		 *
		 * Public APIs should have `/** ... *​/` documentation. Internal/unexported
		 * functions are not flagged.
		 */
		'require-export-jsdoc': {
			create(context) {
				function hasJSDoc(node) {
					const src = context.sourceCode.text;
					let idx = node.start - 1;
					// Walk backwards past whitespace
					while (idx >= 0 && (src[idx] === ' ' || src[idx] === '\t' || src[idx] === '\n' || src[idx] === '\r')) {
						idx--;
					}
					// Check if preceding non-whitespace ends with */
					if (idx >= 1 && src[idx] === '/' && src[idx - 1] === '*') {
						// Find the opening /**
						const closeIdx = idx;
						const openIdx = src.lastIndexOf('/**', closeIdx);
						if (openIdx !== -1 && openIdx < closeIdx) {
							return true;
						}
					}
					return false;
				}

				function isExported(node) {
					const parent = node.parent;
					if (!parent) return false;
					return (
						parent.type === 'ExportNamedDeclaration' ||
						parent.type === 'ExportDefaultDeclaration'
					);
				}

				function check(node) {
					const target = isExported(node) ? node.parent : null;
					if (!target) return;
					if (!hasJSDoc(target)) {
						context.report({
							node,
							message: 'Exported functions and classes should have a JSDoc comment.',
						});
					}
				}

				return {
					FunctionDeclaration: check,
					ClassDeclaration: check,
				};
			},
		},

		/**
		 * Require exported functions to be `async`.
		 *
		 * Public-facing functions should default to `async` to future-proof
		 * the API — adding async later is a breaking change for callers that
		 * don't `await`.
		 *
		 * Ignores:
		 *   - Non-exported functions
		 *   - Class methods (checked separately if needed)
		 *   - Functions that return explicit non-Promise types (type-level;
		 *     this rule only checks the `async` keyword at the syntax level)
		 */
		'exported-function-async': {
			create(context) {
				function isExported(node) {
					const parent = node.parent;
					if (!parent) return false;
					return (
						parent.type === 'ExportNamedDeclaration' ||
						parent.type === 'ExportDefaultDeclaration'
					);
				}

				return {
					FunctionDeclaration(node) {
						if (!isExported(node)) return;
						if (node.async) return;
						const name = node.id?.name ?? 'anonymous';
						context.report({
							node,
							message: `Exported function \`${name}\` should be \`async\`. Public APIs default to async to avoid breaking changes.`,
						});
					},
				};
			},
		},
	},
};

export default plugin;
