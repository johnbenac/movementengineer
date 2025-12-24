import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DATA_MODEL_V2_3 = require('../../../src/models/dataModel.v2_3.js');
globalThis.DATA_MODEL_V2_3 = DATA_MODEL_V2_3;
const ModelRegistry = require('../../../src/core/modelRegistry');

describe('ModelRegistry export schema', () => {
  it('returns expected exporter schema for representative collections', () => {
    const model = ModelRegistry.getModel('2.3');
    const expected = {
      movements: {
        fields: ['id', 'movementId', 'name', 'shortName', 'tags', 'status', 'order'],
        bodyField: 'summary'
      },
      entities: {
        fields: ['id', 'movementId', 'name', 'kind', 'tags', 'sourceEntityIds', 'sourcesOfTruth', 'order'],
        bodyField: 'summary'
      },
      texts: {
        fields: [
          'id',
          'movementId',
          'title',
          'label',
          'parentId',
          'mainFunction',
          'tags',
          'mentionsEntityIds',
          'order'
        ],
        bodyField: 'content'
      }
    };

    Object.entries(expected).forEach(([collectionName, schema]) => {
      expect(model.getExportSchema(collectionName)).toEqual(schema);
    });
  });
});
