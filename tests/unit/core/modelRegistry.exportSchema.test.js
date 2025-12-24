import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DATA_MODEL_V2_3 = require('../../../src/models/dataModel.v2_3.js');
globalThis.DATA_MODEL_V2_3 = DATA_MODEL_V2_3;
const { getModel } = require('../../../src/core/modelRegistry');

describe('ModelRegistry export schema', () => {
  const model = getModel('2.3');

  it('returns the movement export schema', () => {
    expect(model.getExportSchema('movements')).toEqual({
      collectionName: 'movements',
      frontMatterFields: ['id', 'movementId', 'name', 'shortName', 'tags', 'status', 'order'],
      bodyField: 'summary'
    });
  });

  it('returns the entities export schema', () => {
    expect(model.getExportSchema('entities')).toEqual({
      collectionName: 'entities',
      frontMatterFields: ['id', 'movementId', 'name', 'kind', 'tags', 'sourceEntityIds', 'sourcesOfTruth', 'order'],
      bodyField: 'summary'
    });
  });

  it('returns the texts export schema', () => {
    expect(model.getExportSchema('texts')).toEqual({
      collectionName: 'texts',
      frontMatterFields: [
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
    });
  });
});
