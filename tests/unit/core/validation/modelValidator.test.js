import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateDataset } = require('../../../../src/core/validation/modelValidator.js');

const model = {
  specVersion: 'test',
  enums: {
    Role: ['leader', 'member']
  },
  collectionOrder: ['movements', 'entities'],
  collections: {
    movements: {
      collectionName: 'movements',
      fields: {
        id: { type: 'string', required: true, nullable: false },
        name: { type: 'string', required: true, nullable: false },
        role: { type: 'string', required: false, nullable: true, enum: 'Role' },
        count: { type: 'number', required: false, nullable: false, min: 1 },
        tags: { type: 'array', required: false, nullable: false, items: { type: 'string' } }
      },
      constraints: [{ kind: 'unique', scope: 'global', fields: ['id'] }]
    },
    entities: {
      collectionName: 'entities',
      fields: {
        id: { type: 'string', required: true, nullable: false },
        movementId: { type: 'string', required: true, nullable: false, ref: 'movements' },
        friends: { type: 'array', required: false, nullable: false, items: { type: 'string', ref: 'entities' } }
      }
    }
  }
};

describe('modelValidator', () => {
  it('reports required fields and null violations', () => {
    const snapshot = {
      movements: [{ id: 'move-1' }, { id: 'move-2', name: null }],
      entities: []
    };
    const report = validateDataset(snapshot, model, { model });
    const codes = report.issues.map(issue => issue.code);
    expect(codes).toContain('NULL_NOT_ALLOWED');
    expect(codes).toContain('REQUIRED');
  });

  it('reports type mismatches and enum violations', () => {
    const snapshot = {
      movements: [{ id: 'move-1', name: 'Name', role: 'invalid', count: '5', tags: 'oops' }],
      entities: []
    };
    const report = validateDataset(snapshot, model, { model });
    const codes = report.issues.map(issue => issue.code);
    expect(codes).toContain('ENUM');
    expect(codes).toContain('TYPE');
  });

  it('validates array items', () => {
    const snapshot = {
      movements: [{ id: 'move-1', name: 'Name', tags: ['ok', 42] }],
      entities: []
    };
    const report = validateDataset(snapshot, model, { model });
    const issue = report.issues.find(i => i.fieldPath === 'tags[1]');
    expect(issue?.code).toBe('TYPE');
  });

  it('reports ref integrity for missing targets', () => {
    const snapshot = {
      movements: [{ id: 'move-1', name: 'Name' }],
      entities: [{ id: 'ent-1', movementId: 'move-1', friends: ['ent-2'] }]
    };
    const report = validateDataset(snapshot, model, { model });
    const issue = report.issues.find(i => i.code === 'REF_MISSING');
    expect(issue?.fieldPath).toBe('friends[0]');
  });
});
