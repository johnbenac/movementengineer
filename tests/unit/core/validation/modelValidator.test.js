import { describe, it, expect } from 'vitest';
import modelValidator from '../../../../src/core/validation/modelValidator.js';

const { validateRecord, validateDataset } = modelValidator;

const model = {
  enums: {
    KindEnum: ['a', 'b']
  },
  collectionOrder: ['movements', 'entities'],
  collections: {
    movements: {
      collectionName: 'movements',
      typeName: 'Movement',
      fields: {
        id: { type: 'string', required: true, nullable: false },
        movementId: { type: 'string', required: true, nullable: false },
        name: { type: 'string', required: true, nullable: false },
        order: { type: 'number', required: false, nullable: true }
      },
      constraints: [{ kind: 'unique', scope: 'global', fields: ['id'] }]
    },
    entities: {
      collectionName: 'entities',
      typeName: 'Entity',
      fields: {
        id: { type: 'string', required: true, nullable: false },
        movementId: { type: 'string', required: true, nullable: false, ref: 'movements' },
        name: { type: 'string', required: true, nullable: false },
        kind: { type: 'string', required: false, nullable: true, enum: 'KindEnum' },
        tags: { type: 'array', required: false, nullable: false, items: { type: 'string' } },
        friendId: { type: 'string', required: false, nullable: true, ref: 'entities' },
        friendIds: { type: 'array', required: false, nullable: false, items: { type: 'string', ref: 'entities' } }
      }
    }
  }
};

function findIssue(issues, code, fieldPath) {
  return issues.find(issue => issue.code === code && issue.fieldPath === fieldPath);
}

describe('modelValidator.validateRecord', () => {
  it('flags required fields when missing', () => {
    const issues = validateRecord({ id: 'm1', movementId: 'm1' }, model.collections.movements, { model });
    expect(findIssue(issues, 'REQUIRED', 'name')).toBeTruthy();
  });

  it('flags nulls when nullable is false', () => {
    const issues = validateRecord({ id: 'm1', movementId: 'm1', name: null }, model.collections.movements, { model });
    expect(findIssue(issues, 'NULL_NOT_ALLOWED', 'name')).toBeTruthy();
  });

  it('flags type mismatches', () => {
    const issues = validateRecord({ id: 'm1', movementId: 'm1', name: 'Name', order: 'bad' }, model.collections.movements, { model });
    expect(findIssue(issues, 'TYPE', 'order')).toBeTruthy();
  });

  it('flags enum membership mismatches', () => {
    const issues = validateRecord(
      { id: 'e1', movementId: 'm1', name: 'Entity', kind: 'c' },
      model.collections.entities,
      { model }
    );
    expect(findIssue(issues, 'ENUM', 'kind')).toBeTruthy();
  });

  it('validates array item types', () => {
    const issues = validateRecord(
      { id: 'e1', movementId: 'm1', name: 'Entity', tags: [1] },
      model.collections.entities,
      { model }
    );
    expect(findIssue(issues, 'TYPE', 'tags[0]')).toBeTruthy();
  });
});

describe('modelValidator.validateDataset', () => {
  it('reports missing ref targets', () => {
    const snapshot = {
      movements: [{ id: 'm1', movementId: 'm1', name: 'Movement' }],
      entities: [
        {
          id: 'e1',
          movementId: 'm1',
          name: 'Entity',
          friendId: 'missing',
          friendIds: ['e1', 'missing']
        }
      ]
    };

    const report = validateDataset(snapshot, model, { model });
    const refFieldIssue = report.issues.find(issue => issue.code === 'REF_MISSING' && issue.fieldPath === 'friendId');
    const refArrayIssue = report.issues.find(issue => issue.code === 'REF_MISSING' && issue.fieldPath === 'friendIds[1]');
    expect(refFieldIssue).toBeTruthy();
    expect(refArrayIssue).toBeTruthy();
  });
});
