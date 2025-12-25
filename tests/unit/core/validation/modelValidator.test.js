import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateDataset } = require('../../../../src/core/validation/modelValidator.js');

const model = {
  specVersion: 'test',
  enums: {
    Role: ['leader', 'member']
  },
  collectionOrder: ['movements', 'entities', 'notes'],
  collections: {
    movements: {
      collectionName: 'movements',
      typeName: 'Movement',
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
      typeName: 'Entity',
      fields: {
        id: { type: 'string', required: true, nullable: false },
        movementId: { type: 'string', required: true, nullable: false, ref: 'movements' },
        friends: { type: 'array', required: false, nullable: false, items: { type: 'string', ref: 'entities' } }
      }
    },
    notes: {
      collectionName: 'notes',
      typeName: 'Note',
      fields: {
        id: { type: 'string', required: true, nullable: false },
        movementId: { type: 'string', required: true, nullable: false, ref: 'movements' },
        targetType: { type: 'string', required: true, nullable: false },
        targetId: { type: 'string', required: true, nullable: false }
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
      entities: [{ id: 'ent-1', movementId: 'move-1', friends: ['ent-2'] }],
      notes: []
    };
    const report = validateDataset(snapshot, model, { model });
    const issue = report.issues.find(i => i.code === 'REF_MISSING');
    expect(issue?.fieldPath).toBe('friends[0]');
  });

  it('reports cross-movement references', () => {
    const snapshot = {
      movements: [
        { id: 'move-1', name: 'One' },
        { id: 'move-2', name: 'Two' }
      ],
      entities: [
        { id: 'ent-1', movementId: 'move-1', friends: ['ent-2'] },
        { id: 'ent-2', movementId: 'move-2', friends: [] }
      ],
      notes: []
    };
    const report = validateDataset(snapshot, model, { model });
    const issue = report.issues.find(i => i.code === 'REF_CROSS_MOVEMENT');
    expect(issue?.fieldPath).toBe('friends[0]');
  });

  it('reports missing note targets', () => {
    const snapshot = {
      movements: [{ id: 'move-1', name: 'One' }],
      entities: [],
      notes: [
        { id: 'note-1', movementId: 'move-1', targetType: 'Entity', targetId: 'ent-missing' }
      ]
    };
    const report = validateDataset(snapshot, model, { model });
    const issue = report.issues.find(i => i.code === 'NOTE_TARGET_MISSING');
    expect(issue?.fieldPath).toBe('targetId');
  });

  it('reports note targets crossing movements', () => {
    const snapshot = {
      movements: [
        { id: 'move-1', name: 'One' },
        { id: 'move-2', name: 'Two' }
      ],
      entities: [{ id: 'ent-2', movementId: 'move-2', friends: [] }],
      notes: [
        { id: 'note-1', movementId: 'move-1', targetType: 'Entity', targetId: 'ent-2' }
      ]
    };
    const report = validateDataset(snapshot, model, { model });
    const issue = report.issues.find(i => i.code === 'NOTE_TARGET_CROSS_MOVEMENT');
    expect(issue?.fieldPath).toBe('targetId');
  });

  it('reports note targets pointing at wrong movement', () => {
    const snapshot = {
      movements: [
        { id: 'move-1', name: 'One' },
        { id: 'move-2', name: 'Two' }
      ],
      entities: [],
      notes: [
        { id: 'note-1', movementId: 'move-1', targetType: 'Movement', targetId: 'move-2' }
      ]
    };
    const report = validateDataset(snapshot, model, { model });
    const issue = report.issues.find(i => i.code === 'NOTE_TARGET_WRONG_MOVEMENT');
    expect(issue?.fieldPath).toBe('targetId');
  });
});
