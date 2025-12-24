import { describe, expect, it } from 'vitest';
import DATA_MODEL_V2_3 from '../../../src/models/dataModel.v2_3.js';

describe('DATA_MODEL_V2_3', () => {
  it('captures the spec version and collection order', () => {
    expect(DATA_MODEL_V2_3.specVersion).toBe('2.3');
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

  it('matches the loader serialization schema for each collection', () => {
    const expectations = {
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
        frontMatterFields: ['id', 'movementId', 'name', 'kind', 'tags', 'sourceEntityIds', 'sourcesOfTruth', 'order'],
        bodyField: 'summary'
      },
      practices: {
        frontMatterFields: [
          'id',
          'movementId',
          'name',
          'kind',
          'frequency',
          'tags',
          'involvedEntityIds',
          'instructionsTextIds',
          'supportingClaimIds',
          'sourceEntityIds',
          'sourcesOfTruth',
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

    Object.entries(expectations).forEach(([collection, expected]) => {
      const schema = DATA_MODEL_V2_3.collections[collection].serialization;
      expect(schema.frontMatterFields).toEqual(expected.frontMatterFields);
      expect(schema.bodyField).toEqual(expected.bodyField);
    });
  });

  it('captures required fields and constraints', () => {
    expect(DATA_MODEL_V2_3.collections.entities.fields.id.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.entities.fields.name.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.media.fields.uri.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.rules.fields.shortText.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.movements.fields.movementId.required).toBe(false);
    expect(DATA_MODEL_V2_3.collections.movements.constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'movementIdEqualsId' })
      ])
    );
  });

  it('documents note target canonical values and aliases', () => {
    expect(DATA_MODEL_V2_3.notes.targetType.canonicalValues).toEqual(
      expect.arrayContaining([
        'Movement',
        'TextNode',
        'Entity',
        'Practice',
        'Event',
        'Rule',
        'Claim',
        'MediaAsset'
      ])
    );
    expect(DATA_MODEL_V2_3.notes.targetType.aliases).toEqual(
      expect.objectContaining({
        movementnode: 'Movement',
        text: 'TextNode',
        media_asset: 'MediaAsset'
      })
    );
  });
});
