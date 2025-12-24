import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateDataset } = require('../../../../src/core/validation/modelValidator');

const model = {
  specVersion: 'test',
  collectionOrder: ['movements', 'notes'],
  enums: {
    Status: ['active', 'inactive']
  },
  collections: {
    movements: {
      collectionName: 'movements',
      fields: {
        id: { type: 'string', required: true, nullable: false },
        name: { type: 'string', required: true, nullable: false, minLength: 2, maxLength: 10 },
        status: { type: 'string', required: false, nullable: true, enum: 'Status' },
        tags: { type: 'array', required: false, nullable: false, items: { type: 'string' } },
        count: { type: 'number', required: false, nullable: false, min: 1, max: 5 },
        code: { type: 'string', required: false, nullable: false, pattern: '^[A-Z]{2}$' },
        noteId: { type: 'string', required: false, nullable: false, ref: 'notes' },
        friends: { type: 'array', required: false, nullable: false, items: { type: 'string', ref: 'notes' } }
      },
      constraints: [{ kind: 'unique', scope: 'global', fields: ['id'] }]
    },
    notes: {
      collectionName: 'notes',
      fields: {
        id: { type: 'string', required: true, nullable: false },
        movementId: { type: 'string', required: true, nullable: false, ref: 'movements' }
      },
      constraints: [{ kind: 'unique', scope: 'global', fields: ['id'] }]
    }
  }
};

function collectIssues(snapshot) {
  return validateDataset(snapshot, model, { model }).issues;
}

function findIssue(issues, code, fieldPath) {
  return issues.find(issue => issue.code === code && issue.fieldPath === fieldPath);
}

describe('modelValidator', () => {
  it('flags required missing fields', () => {
    const issues = collectIssues({ movements: [{ id: 'mov-1' }], notes: [] });
    expect(findIssue(issues, 'REQUIRED', 'name')).toBeTruthy();
  });

  it('flags non-nullable null values', () => {
    const issues = collectIssues({ movements: [{ id: 'mov-1', name: null }], notes: [] });
    expect(findIssue(issues, 'NULL_NOT_ALLOWED', 'name')).toBeTruthy();
  });

  it('flags type mismatches', () => {
    const issues = collectIssues({
      movements: [{ id: 'mov-1', name: 'Valid', count: 'bad', tags: {} }],
      notes: []
    });
    expect(findIssue(issues, 'TYPE', 'count')).toBeTruthy();
    expect(findIssue(issues, 'TYPE', 'tags')).toBeTruthy();
  });

  it('flags enum mismatches', () => {
    const issues = collectIssues({
      movements: [{ id: 'mov-1', name: 'Valid', status: 'unknown' }],
      notes: []
    });
    expect(findIssue(issues, 'ENUM', 'status')).toBeTruthy();
  });

  it('validates array items', () => {
    const issues = collectIssues({
      movements: [{ id: 'mov-1', name: 'Valid', tags: ['ok', 3] }],
      notes: []
    });
    expect(findIssue(issues, 'TYPE', 'tags[1]')).toBeTruthy();
  });

  it('checks reference integrity for refs and array refs', () => {
    const issues = collectIssues({
      movements: [
        {
          id: 'mov-1',
          name: 'Valid',
          noteId: 'note-missing',
          friends: ['note-1', 'note-missing']
        }
      ],
      notes: [{ id: 'note-1', movementId: 'mov-1' }]
    });
    expect(findIssue(issues, 'REF_MISSING', 'noteId')).toBeTruthy();
    expect(findIssue(issues, 'REF_MISSING', 'friends[1]')).toBeTruthy();
  });

  it('applies pattern and numeric constraints', () => {
    const issues = collectIssues({
      movements: [{ id: 'mov-1', name: 'A', count: 10, code: 'abc' }],
      notes: []
    });
    expect(findIssue(issues, 'MIN_LENGTH', 'name')).toBeTruthy();
    expect(findIssue(issues, 'MAX', 'count')).toBeTruthy();
    expect(findIssue(issues, 'PATTERN', 'code')).toBeTruthy();
  });
});
