import { describe, expect, it, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { buildRefOptions } from '../../../src/ui/genericCrud/genericCrudHelpers.js';

const require = createRequire(import.meta.url);
const DATA_MODEL_V2_3 = require('../../../src/models/dataModel.v2_3.js');
globalThis.DATA_MODEL_V2_3 = DATA_MODEL_V2_3;
const ModelRegistry = require('../../../src/core/modelRegistry');

describe('genericCrudHelpers buildRefOptions', () => {
  beforeAll(() => {
    globalThis.ModelRegistry = ModelRegistry;
  });

  it('resolves polymorphic ref options from targetType', () => {
    const model = ModelRegistry.getModel('2.3');
    const snapshot = {
      specVersion: '2.3',
      movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
      texts: [
        { id: 't1', movementId: 'm1', title: 'Root' },
        { id: 't2', movementId: 'm2', title: 'Other' }
      ],
      entities: [
        { id: 'e1', movementId: 'm1', name: 'Entity One' },
        { id: 'e2', movementId: 'm2', name: 'Entity Two' }
      ]
    };
    const fieldDef = model.collections.notes.fields.targetId;
    const record = { movementId: 'm1', targetType: 'TextNode' };

    const textOptions = buildRefOptions({
      model,
      snapshot,
      fieldDef,
      record
    });

    expect(textOptions.map(option => option.value)).toEqual(['t1']);

    const entityOptions = buildRefOptions({
      model,
      snapshot,
      fieldDef,
      record: { movementId: 'm1', targetType: 'Entity' }
    });

    expect(entityOptions.map(option => option.value)).toEqual(['e1']);
  });
});
