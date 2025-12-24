# Model validation shadow mode

Shadow mode runs the new model-driven validator alongside the legacy checks and compares the results. It is **off by default** and does not change runtime behavior unless you enable it.

## How to enable shadow validation

### Browser (most common)

1. Open the app.
2. Open devtools console.
3. Set the flags:

```js
window.ME_MODEL_VALIDATION_SHADOW = '1';
window.ME_MODEL_VALIDATION_MAX_ISSUES = '500';
window.ME_MODEL_VALIDATION_LOG_EXAMPLES = '20';
```

4. Trigger a dataset load (for example, “Load markdown repo” or any action that calls
   `importMovementRepo` / `loadMovementDataset`).

### Node (tests/CLI)

```bash
ME_MODEL_VALIDATION_SHADOW=1 \
ME_MODEL_VALIDATION_MAX_ISSUES=500 \
ME_MODEL_VALIDATION_LOG_EXAMPLES=20 \
npm test
```

### Knobs (canonical)

- `ME_MODEL_VALIDATION_SHADOW` → on/off
- `ME_MODEL_VALIDATION_MAX_ISSUES` → cap (default `500`)
- `ME_MODEL_VALIDATION_LOG_EXAMPLES` → console sample cap (default `20`)

## What you’ll see

When enabled and modules are present, a single collapsed console group appears:

```
[Model Validation Shadow] …
```

If shadow mode is enabled but required modules are missing, you’ll see:

```
[Model Validation Shadow] modules unavailable; skipping.
```

## How to inspect results

Shadow validation attaches results to the compiled snapshot:

```js
snapshot.__debug.modelValidationShadow = {
  modelReport,
  diff
};
```

- `modelReport.issues` — full list of model validator issues
- `diff.onlyModel` — issues **model found but legacy didn’t**
- `diff.onlyLegacy` — issues **legacy found but model didn’t** (likely empty at first)
- `diff.both` — matched issues (same stable key)

### Suggested workflow

Set a breakpoint in `src/core/markdownDatasetLoader.js` where it assigns:

```js
compiled.data.__debug.modelValidationShadow = { modelReport, diff };
```

Inspect the payload directly from the debugger.
