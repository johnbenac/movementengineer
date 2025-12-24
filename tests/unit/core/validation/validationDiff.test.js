import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { diffValidationReports, issueKey } = require('../../../../src/core/validation/validationDiff.js');

function makeIssue(overrides = {}) {
  return {
    source: 'legacy',
    severity: 'error',
    code: 'REQUIRED',
    collection: 'movements',
    recordId: 'm1',
    fieldPath: 'name',
    message: 'Missing name.',
    ...overrides
  };
}

describe('validationDiff', () => {
  it('matches issues by stable key', () => {
    const legacyIssues = [makeIssue()];
    const modelIssues = [makeIssue({ source: 'model' })];
    const diff = diffValidationReports(legacyIssues, modelIssues);
    expect(diff.onlyLegacy).toHaveLength(0);
    expect(diff.onlyModel).toHaveLength(0);
    expect(diff.both).toHaveLength(1);
  });

  it('tracks issues only in one side', () => {
    const legacyIssues = [makeIssue({ code: 'REQUIRED' })];
    const modelIssues = [makeIssue({ code: 'TYPE' })];
    const diff = diffValidationReports(legacyIssues, modelIssues);
    expect(diff.onlyLegacy).toHaveLength(1);
    expect(diff.onlyModel).toHaveLength(1);
  });

  it('uses defaults for missing recordId and fieldPath', () => {
    const issue = makeIssue({ recordId: undefined, fieldPath: undefined });
    expect(issueKey(issue)).toBe('movements::?::__record__::REQUIRED');
  });
});
