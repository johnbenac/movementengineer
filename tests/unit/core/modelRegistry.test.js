import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DATA_MODEL_V2_3 = require('../../../src/models/dataModel.v2_3.js');
globalThis.DATA_MODEL_V2_3 = DATA_MODEL_V2_3;
const { getModel } = require('../../../src/core/modelRegistry.js');

describe('ModelRegistry export schema', () => {
  it('derives export schema for representative collections', () => {
    const model = getModel('2.3');

    expect(model.getExportSchema('movements')).toEqual({
      collectionName: 'movements',
      frontMatterFields: ['id', 'movementId', 'name', 'shortName', 'tags', 'status', 'order'],
      bodyField: 'summary'
    });

    expect(model.getExportSchema('entities')).toEqual({
      collectionName: 'entities',
      frontMatterFields: ['id', 'movementId', 'name', 'kind', 'tags', 'sourceEntityIds', 'sourcesOfTruth', 'order'],
      bodyField: 'summary'
    });

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
