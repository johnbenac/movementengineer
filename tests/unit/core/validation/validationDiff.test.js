import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { diffValidationReports, issueKey } = require('../../../../src/core/validation/validationDiff.js');

function makeIssue(overrides) {
  return {
    source: 'legacy',
    severity: 'error',
    code: 'TYPE',
    collection: 'entities',
    recordId: 'e1',
    fieldPath: 'name',
    message: 'test',
    ...overrides
  };
}

describe('validationDiff', () => {
  it('matches issues by stable key', () => {
    const legacy = [makeIssue()];
    const model = [makeIssue({ source: 'model' })];
    const diff = diffValidationReports(legacy, model);
    expect(diff.onlyLegacy).toHaveLength(0);
    expect(diff.onlyModel).toHaveLength(0);
    expect(diff.both).toHaveLength(1);
  });

  it('computes onlyLegacy and onlyModel correctly', () => {
    const legacy = [makeIssue({ recordId: 'e1' })];
    const model = [makeIssue({ recordId: 'e2', source: 'model' })];
    const diff = diffValidationReports(legacy, model);
    expect(diff.onlyLegacy).toHaveLength(1);
    expect(diff.onlyModel).toHaveLength(1);
  });

  it('uses defaults in issue keys', () => {
    const key = issueKey({ collection: 'entities', code: 'TYPE' });
    expect(key).toBe('entities::?::__record__::TYPE');
  });
});
