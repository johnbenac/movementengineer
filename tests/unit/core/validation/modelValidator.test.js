import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateDataset } = require('../../../../src/core/validation/modelValidator.js');

function buildModel(overrides = {}) {
  return {
    specVersion: 'test',
    enums: {
      Kind: ['a', 'b']
    },
    collections: {
      movements: {
        collectionName: 'movements',
        fields: {
          id: { type: 'string', required: true, nullable: false },
          movementId: { type: 'string', required: false, nullable: false, ref: 'movements' },
          name: { type: 'string', required: false, nullable: false, minLength: 3 },
          order: { type: 'number', required: false, nullable: true },
          kind: { type: 'string', required: false, nullable: false, enum: 'Kind' },
          tags: { type: 'array', required: false, nullable: false, items: { type: 'string' } }
        }
      },
      entities: {
        collectionName: 'entities',
        fields: {
          id: { type: 'string', required: true, nullable: false },
          movementId: { type: 'string', required: true, nullable: false, ref: 'movements' },
          friends: { type: 'array', required: false, nullable: false, items: { type: 'string', ref: 'entities' } }
        }
      }
    },
    collectionOrder: ['movements', 'entities'],
    ...overrides
  };
}

function issueCodes(report) {
  return report.issues.map(issue => issue.code);
}

describe('modelValidator', () => {
  it('flags required fields when missing', () => {
    const model = buildModel();
    const snapshot = { movements: [{ movementId: 'm1' }], entities: [] };
    const report = validateDataset(snapshot, model, { maxIssues: 50 });
    expect(issueCodes(report)).toContain('REQUIRED');
    const requiredIssue = report.issues.find(issue => issue.code === 'REQUIRED');
    expect(requiredIssue.fieldPath).toBe('id');
  });

  it('flags nulls when nullable is false', () => {
    const model = buildModel();
    const snapshot = { movements: [{ id: null }], entities: [] };
    const report = validateDataset(snapshot, model, { maxIssues: 50 });
    expect(issueCodes(report)).toContain('NULL_NOT_ALLOWED');
  });

  it('flags type mismatches', () => {
    const model = buildModel();
    const snapshot = { movements: [{ id: 'm1', order: 'bad', tags: { nope: true } }], entities: [] };
    const report = validateDataset(snapshot, model, { maxIssues: 50 });
    const codes = issueCodes(report);
    expect(codes).toContain('TYPE');
  });

  it('flags enum violations', () => {
    const model = buildModel();
    const snapshot = { movements: [{ id: 'm1', kind: 'c' }], entities: [] };
    const report = validateDataset(snapshot, model, { maxIssues: 50 });
    expect(issueCodes(report)).toContain('ENUM');
  });

  it('validates array items', () => {
    const model = buildModel();
    const snapshot = { movements: [{ id: 'm1', tags: [1] }], entities: [] };
    const report = validateDataset(snapshot, model, { maxIssues: 50 });
    const issue = report.issues.find(entry => entry.code === 'TYPE');
    expect(issue.fieldPath).toBe('tags[0]');
  });

  it('checks ref integrity including arrays', () => {
    const model = buildModel();
    const snapshot = {
      movements: [{ id: 'm1' }],
      entities: [{ id: 'e1', movementId: 'missing', friends: ['e1', 'e2'] }]
    };
    const report = validateDataset(snapshot, model, { maxIssues: 50 });
    const refIssues = report.issues.filter(entry => entry.code === 'REF_MISSING');
    expect(refIssues.map(issue => issue.fieldPath)).toEqual(expect.arrayContaining(['movementId', 'friends[1]']));
  });

  it('applies string constraints', () => {
    const model = buildModel();
    const snapshot = { movements: [{ id: 'm1', name: 'hi' }], entities: [] };
    const report = validateDataset(snapshot, model, { maxIssues: 50 });
    expect(issueCodes(report)).toContain('MIN_LENGTH');
  });
});
