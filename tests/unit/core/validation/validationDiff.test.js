import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { diffValidationReports, issueKey } = require('../../../../src/core/validation/validationDiff');

function issue(overrides = {}) {
  return {
    source: 'legacy',
    severity: 'error',
    code: 'TYPE',
    collection: 'movements',
    recordId: 'mov-1',
    fieldPath: 'name',
    message: 'Invalid',
    ...overrides
  };
}

describe('validationDiff', () => {
  it('matches exact keys and removes from diffs', () => {
    const legacyIssues = [issue()];
    const modelIssues = [issue({ source: 'model', message: 'Different message' })];
    const diff = diffValidationReports(legacyIssues, modelIssues);
    expect(diff.onlyLegacy).toHaveLength(0);
    expect(diff.onlyModel).toHaveLength(0);
    expect(diff.both).toHaveLength(1);
  });

  it('returns onlyLegacy and onlyModel entries', () => {
    const legacyIssues = [issue({ fieldPath: 'name' })];
    const modelIssues = [issue({ fieldPath: 'status', source: 'model' })];
    const diff = diffValidationReports(legacyIssues, modelIssues);
    expect(diff.onlyLegacy).toHaveLength(1);
    expect(diff.onlyModel).toHaveLength(1);
    expect(diff.summary.onlyLegacy).toBe(1);
    expect(diff.summary.onlyModel).toBe(1);
  });

  it('uses default key parts for missing fields', () => {
    const key = issueKey({ code: 'REQUIRED', collection: 'movements' });
    expect(key).toBe('movements::?::__record__::REQUIRED');
  });
});
