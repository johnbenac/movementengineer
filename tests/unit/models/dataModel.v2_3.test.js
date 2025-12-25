import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DATA_MODEL_V2_3 = require('../../../src/models/dataModel.v2_3.js');

describe('DATA_MODEL_V2_3', () => {
  it('matches the spec version', () => {
    expect(DATA_MODEL_V2_3.specVersion).toBe('2.3');
  });

  it('keeps the loader collection order', () => {
    expect(DATA_MODEL_V2_3.collectionsOrder).toEqual([
      'movements',
      'textCollections',
      'texts',
      'entities',
      'practices',
      'events',
      'rules',
      'claims',
      'media',
      'notes'
    ]);
  });

  it('matches export serialization mappings', () => {
    const expected = {
      movements: {
        frontMatterFields: ['id', 'movementId', 'name', 'shortName', 'tags', 'status', 'order'],
        bodyField: 'summary'
      },
      textCollections: {
        frontMatterFields: ['id', 'movementId', 'name', 'rootTextIds', 'description', 'tags', 'order'],
        bodyField: 'description'
      },
      texts: {
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
      },
      entities: {
        frontMatterFields: [
          'id',
          'movementId',
          'name',
          'kind',
          'tags',
          'sourceEntityIds',
          'sourcesOfTruth',
          'notes',
          'order'
        ],
        bodyField: 'summary'
      },
      practices: {
        frontMatterFields: [
          'id',
          'movementId',
          'name',
          'kind',
          'frequency',
          'isPublic',
          'tags',
          'involvedEntityIds',
          'instructionsTextIds',
          'supportingClaimIds',
          'sourceEntityIds',
          'sourcesOfTruth',
          'notes',
          'order'
        ],
        bodyField: 'description'
      },
      events: {
        frontMatterFields: [
          'id',
          'movementId',
          'name',
          'recurrence',
          'timingRule',
          'notes',
          'tags',
          'mainPracticeIds',
          'mainEntityIds',
          'readingTextIds',
          'supportingClaimIds',
          'order'
        ],
        bodyField: 'description'
      },
      rules: {
        frontMatterFields: [
          'id',
          'movementId',
          'shortText',
          'kind',
          'appliesTo',
          'domain',
          'tags',
          'supportingTextIds',
          'supportingClaimIds',
          'relatedPracticeIds',
          'sourceEntityIds',
          'sourcesOfTruth',
          'order'
        ],
        bodyField: 'details'
      },
      claims: {
        frontMatterFields: [
          'id',
          'movementId',
          'text',
          'category',
          'tags',
          'aboutEntityIds',
          'sourceTextIds',
          'sourceEntityIds',
          'sourcesOfTruth',
          'notes',
          'order'
        ],
        bodyField: 'text'
      },
      media: {
        frontMatterFields: [
          'id',
          'movementId',
          'kind',
          'uri',
          'title',
          'tags',
          'linkedEntityIds',
          'linkedPracticeIds',
          'linkedEventIds',
          'linkedTextIds',
          'order'
        ],
        bodyField: 'description'
      },
      notes: {
        frontMatterFields: ['id', 'movementId', 'targetType', 'targetId', 'author', 'context', 'tags', 'order'],
        bodyField: 'body'
      }
    };

    Object.entries(expected).forEach(([collectionName, schema]) => {
      const modelSchema = DATA_MODEL_V2_3.collections[collectionName].serialization;
      expect(modelSchema.frontMatterFields).toEqual(schema.frontMatterFields);
      expect(modelSchema.bodyField).toEqual(schema.bodyField);
    });
  });

  it('documents required fields and constraints', () => {
    expect(DATA_MODEL_V2_3.collections.entities.fields.id.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.entities.fields.name.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.media.fields.uri.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.rules.fields.shortText.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.movements.fields.movementId.required).toBe(false);

    const movementConstraints = DATA_MODEL_V2_3.collections.movements.constraints || [];
    expect(movementConstraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'movementIdMatchesId'
        })
      ])
    );
  });

  it('documents note target type aliases', () => {
    const noteTypes = DATA_MODEL_V2_3.notes.targetType;
    expect(noteTypes.canonicalValues).toEqual(
      expect.arrayContaining(['Movement', 'TextNode', 'Entity', 'Practice', 'Event', 'Rule', 'Claim', 'MediaAsset'])
    );
    expect(noteTypes.aliases.movementnode).toBe('Movement');
    expect(noteTypes.aliases.text).toBe('TextNode');
    expect(noteTypes.aliases.media_asset).toBe('MediaAsset');
  });
});
