import { describe, it, expect } from 'vitest';
import validationDiff from '../../../../src/core/validation/validationDiff.js';

const { diffValidationReports, getIssueKey } = validationDiff;

describe('validationDiff', () => {
  it('matches issues using stable keys', () => {
    const legacyIssues = [
      {
        source: 'legacy',
        severity: 'error',
        code: 'REQUIRED',
        collection: 'entities',
        recordId: 'e1',
        fieldPath: 'name',
        message: 'Missing name'
      }
    ];
    const modelIssues = [
      {
        source: 'model',
        severity: 'error',
        code: 'REQUIRED',
        collection: 'entities',
        recordId: 'e1',
        fieldPath: 'name',
        message: 'Required field is missing.'
      }
    ];

    const diff = diffValidationReports(legacyIssues, modelIssues);
    expect(diff.onlyLegacy.length).toBe(0);
    expect(diff.onlyModel.length).toBe(0);
    expect(diff.both.length).toBe(1);
  });

  it('separates only-legacy and only-model issues', () => {
    const legacyIssues = [
      {
        source: 'legacy',
        severity: 'error',
        code: 'REQUIRED',
        collection: 'entities',
        recordId: 'e1',
        fieldPath: 'name',
        message: 'Missing name'
      }
    ];
    const modelIssues = [
      {
        source: 'model',
        severity: 'error',
        code: 'TYPE',
        collection: 'entities',
        recordId: 'e1',
        fieldPath: 'name',
        message: 'Expected string.'
      }
    ];

    const diff = diffValidationReports(legacyIssues, modelIssues);
    expect(diff.onlyLegacy.length).toBe(1);
    expect(diff.onlyModel.length).toBe(1);
    expect(diff.both.length).toBe(0);
  });

  it('uses defaults when recordId or fieldPath is missing', () => {
    const issue = { collection: 'movements', code: 'TYPE' };
    expect(getIssueKey(issue)).toBe('movements::?::__record__::TYPE');
  });
});
