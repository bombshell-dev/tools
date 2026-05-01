// Shared helpers — hoisted so multiple rules share one implementation.

function isExportedDeclaration(node) {
	const parent = node.parent;
	if (!parent) return false;
	return (
		parent.type === 'ExportNamedDeclaration' ||
		parent.type === 'ExportDefaultDeclaration'
	);
}

function isExportedConstInitializer(node) {
	const parent = node.parent;
	if (!parent || parent.type !== 'VariableDeclarator') return false;
	const decl = parent.parent;
	if (!decl || decl.type !== 'VariableDeclaration') return false;
	const exp = decl.parent;
	return (
		!!exp &&
		(exp.type === 'ExportNamedDeclaration' || exp.type === 'ExportDefaultDeclaration')
	);
}

function isExportedFunction(node) {
	return isExportedDeclaration(node) || isExportedConstInitializer(node);
}

function functionName(node) {
	if (node.id?.name) return node.id.name;
	if (node.parent?.type === 'VariableDeclarator' && node.parent.id?.name) {
		return node.parent.id.name;
	}
	return 'anonymous';
}

function getJSDocText(node, sourceText) {
	let idx = node.start - 1;
	while (idx >= 0 && (sourceText[idx] === ' ' || sourceText[idx] === '\t' || sourceText[idx] === '\n' || sourceText[idx] === '\r')) {
		idx--;
	}
	if (idx >= 1 && sourceText[idx] === '/' && sourceText[idx - 1] === '*') {
		const closeIdx = idx;
		const openIdx = sourceText.lastIndexOf('/**', closeIdx);
		if (openIdx !== -1 && openIdx < closeIdx) {
			return sourceText.substring(openIdx, closeIdx + 1);
		}
	}
	return null;
}

function paramName(param) {
	if (!param) return null;
	if (param.type === 'Identifier') return param.name;
	if (param.type === 'AssignmentPattern') return paramName(param.left);
	if (param.type === 'RestElement') return paramName(param.argument);
	if (param.type === 'TSParameterProperty') return paramName(param.parameter);
	return null;
}

function isOptionsBagParam(param) {
	if (!param) return false;
	if (param.type === 'ObjectPattern') return true;
	if (param.type === 'AssignmentPattern' && param.left?.type === 'ObjectPattern') return true;
	if (param.type === 'RestElement') return true;
	const name = paramName(param);
	if (!name) return false;
	return /^(options?|opts|config|settings)$/i.test(name);
}

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
				function check(node) {
					const target = isExportedDeclaration(node) ? node.parent : null;
					if (!target) return;
					if (!getJSDocText(target, context.sourceCode.text)) {
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
		 * Require each parameter on an exported function to have a `@param` tag,
		 * and require a `@returns` tag when the function declares a non-void
		 * return type. Catches drift between signature and docs.
		 *
		 * Only fires when JSDoc is present; missing JSDoc is `require-export-jsdoc`'s
		 * concern.
		 */
		'jsdoc-has-params': {
			create(context) {
				const PARAM_TAG_RE = /@param\s+(?:\{[^}]*\}\s+)?(?:\[)?([A-Za-z_$][\w$]*)/g;

				function check(node) {
					const target = isExportedDeclaration(node) ? node.parent : null;
					if (!target) return;
					const text = getJSDocText(target, context.sourceCode.text);
					if (!text) return;

					const documented = new Set();
					PARAM_TAG_RE.lastIndex = 0;
					let m;
					while ((m = PARAM_TAG_RE.exec(text))) documented.add(m[1]);

					for (const param of node.params) {
						const name = paramName(param);
						if (!name) continue;
						if (name.startsWith('_')) continue;
						if (!documented.has(name)) {
							context.report({
								node: param,
								message: `Parameter \`${name}\` is missing from JSDoc \`@param\` tags.`,
							});
						}
					}

					const returnType = node.returnType?.typeAnnotation;
					if (!returnType) return;
					const isVoidLike =
						returnType.type === 'TSVoidKeyword' ||
						returnType.type === 'TSUndefinedKeyword' ||
						returnType.type === 'TSNeverKeyword';
					if (!isVoidLike && !text.includes('@returns') && !text.includes('@return ')) {
						context.report({
							node,
							message: 'Function with a non-void return type should document `@returns`.',
						});
					}
				}

				return {
					FunctionDeclaration: check,
				};
			},
		},

		/**
		 * Cap parameters on authored functions, but skip callbacks whose
		 * signatures are dictated by the receiving API (Array.prototype.map,
		 * event listeners, Promise executors, third-party libs).
		 *
		 * Skips: function expressions / arrow functions passed as arguments
		 * to a `CallExpression` or `NewExpression`.
		 * Checks: function declarations, class methods, constructors, and
		 * function expressions / arrows that aren't passed as arguments.
		 *
		 * Options: `{ max?: number }` — default 2.
		 */
		'max-params': {
			meta: {
				schema: [
					{
						type: 'object',
						properties: {
							max: { type: 'integer', minimum: 0 },
						},
						additionalProperties: false,
					},
				],
			},
			create(context) {
				const max = context.options[0]?.max ?? 2;

				function isCallbackArgument(node) {
					const parent = node.parent;
					if (!parent) return false;
					if (parent.type !== 'CallExpression' && parent.type !== 'NewExpression') {
						return false;
					}
					return parent.arguments.includes(node);
				}

				function check(node) {
					if (
						(node.type === 'FunctionExpression' ||
							node.type === 'ArrowFunctionExpression') &&
						isCallbackArgument(node)
					) {
						return;
					}
					if (node.params.length > max) {
						context.report({
							node,
							message: `Functions should not have more than ${max} parameters (found ${node.params.length}). Authored APIs stay narrow; if this is a callback for a third-party API, the rule should have skipped it — file a bug.`,
						});
					}
				}

				return {
					FunctionDeclaration: check,
					FunctionExpression: check,
					ArrowFunctionExpression: check,
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
		 *   - Functions with an explicit return type annotation. Annotating
		 *     a return type is a deliberate signal that the function is sync
		 *     by design — covers type predicates (`X is Y`, which can't be
		 *     async), pure helpers (`: number`, `: string`), and already-
		 *     shipped public APIs that can't be async-ified without a major
		 *     bump. To opt back in, write `: Promise<T>` and `async`.
		 */
		'exported-function-async': {
			create(context) {
				return {
					FunctionDeclaration(node) {
						if (!isExportedDeclaration(node)) return;
						if (node.async) return;
						if (node.returnType) return;
						context.report({
							node,
							message: `Exported function \`${functionName(node)}\` should be \`async\`, or annotate an explicit return type to opt out. Public APIs default to async to avoid breaking changes.`,
						});
					},
				};
			},
		},

		/**
		 * Require exported functions and public class methods to declare an
		 * explicit return type.
		 *
		 * Replaces the broader `typescript/explicit-function-return-type`,
		 * which fires on private/protected methods where TS inference is fine.
		 * Drift on the public surface is what costs consumers — internal
		 * inference is a feature, not a bug.
		 *
		 * Checks:
		 *   - `export function foo() {}`
		 *   - `export const foo = () => {}` / `export const foo = function () {}`
		 *   - Public methods (no modifier or explicit `public`) on exported classes
		 *
		 * Skips: private/protected/constructor methods, internals.
		 */
		'exported-needs-return-type': {
			create(context) {
				function reportIfMissing(node, name, kind) {
					if (node.returnType) return;
					context.report({
						node,
						message: `Exported ${kind} \`${name}\` must declare an explicit return type. Stable signatures keep accidental drift from leaking into consumers.`,
					});
				}

				return {
					FunctionDeclaration(node) {
						if (!isExportedDeclaration(node)) return;
						reportIfMissing(node, functionName(node), 'function');
					},
					ArrowFunctionExpression(node) {
						if (!isExportedConstInitializer(node)) return;
						reportIfMissing(node, functionName(node), 'function');
					},
					FunctionExpression(node) {
						if (!isExportedConstInitializer(node)) return;
						reportIfMissing(node, functionName(node), 'function');
					},
					MethodDefinition(node) {
						if (node.kind === 'constructor') return;
						if (node.accessibility === 'private' || node.accessibility === 'protected') return;
						const classBody = node.parent;
						if (!classBody || classBody.type !== 'ClassBody') return;
						const cls = classBody.parent;
						if (!cls || cls.type !== 'ClassDeclaration') return;
						if (!isExportedDeclaration(cls)) return;
						const fn = node.value;
						if (!fn) return;
						const keyName = node.key?.name ?? node.key?.value ?? 'method';
						reportIfMissing(fn, keyName, 'method');
					},
				};
			},
		},

		/**
		 * Steer exported functions toward the options-bag pattern.
		 *
		 * Multi-positional parameters force callers to remember order and make
		 * later additions a breaking change. Prefer `fn({ foo, bar })` —
		 * additive, self-documenting, and tooling-friendly.
		 *
		 * Allows:
		 *   - 0 or 1 param of any shape
		 *   - `fn(value, options)` where the trailing param is an
		 *     `ObjectPattern` or named `options` / `opts` / `config` / `settings`
		 *   - Rest parameters (`...args`)
		 *
		 * Flags: any other shape, e.g. `fn(a, b)` or `fn(a, b, c)`.
		 */
		'exported-options-bag': {
			create(context) {
				function check(node) {
					if (!isExportedFunction(node)) return;
					if (node.params.length <= 1) return;
					for (let i = 1; i < node.params.length; i++) {
						const p = node.params[i];
						if (!isOptionsBagParam(p)) {
							const name = paramName(p) ?? 'param';
							context.report({
								node: p,
								message: `Exported APIs should pass multiple values as a single options object instead of positional parameters. Move \`${name}\` into an options bag (e.g. \`fn({ ${name} })\`) for forward-compatible signatures.`,
							});
							return;
						}
					}
				}

				return {
					FunctionDeclaration: check,
					ArrowFunctionExpression: check,
					FunctionExpression: check,
				};
			},
		},

		/**
		 * Forbid module-scoped `let` and `var`.
		 *
		 * Module-level mutable state is hidden global state — it bakes into
		 * snapshots, leaks between callers, and makes testing harder. Use
		 * `const` for true constants, or move mutable state inside a factory
		 * function (`createX()` returns a fresh state object per call).
		 *
		 * Especially important for SEA snapshots: module-init values get
		 * frozen at build time, which is rarely what authors of `let` intend.
		 */
		'no-let-at-module-scope': {
			create(context) {
				return {
					VariableDeclaration(node) {
						if (node.kind === 'const') return;
						if (node.parent?.type !== 'Program') return;
						context.report({
							node,
							message: `Module-scoped \`${node.kind}\` is hidden state — bakes into snapshots, leaks across callers, and breaks tests. Use \`const\`, or move into a factory function.`,
						});
					},
				};
			},
		},
	},
};

export default plugin;
