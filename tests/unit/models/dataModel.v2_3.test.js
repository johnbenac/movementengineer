import { describe, expect, it } from 'vitest';
import DATA_MODEL_V2_3 from '../../../src/models/dataModel.v2_3.js';

describe('DATA_MODEL_V2_3', () => {
  it('matches the spec version', () => {
    expect(DATA_MODEL_V2_3.specVersion).toBe('2.3');
  });

  it('exposes collections in loader order', () => {
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

  it('matches the loader collection serialization schema', () => {
    const expectedSchemas = {
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

    Object.entries(expectedSchemas).forEach(([collectionName, schema]) => {
      const modelSchema = DATA_MODEL_V2_3.collections[collectionName].serialization;
      expect(modelSchema.frontMatterFields).toEqual(schema.frontMatterFields);
      expect(modelSchema.bodyField).toBe(schema.bodyField);
    });
  });

  it('captures required fields for key collections', () => {
    expect(DATA_MODEL_V2_3.collections.entities.fields.id.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.entities.fields.name.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.media.fields.uri.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.rules.fields.shortText.required).toBe(true);
    expect(DATA_MODEL_V2_3.collections.movements.fields.movementId.required).toBe(false);

    const movementConstraints = DATA_MODEL_V2_3.collections.movements.constraints;
    expect(
      movementConstraints.some(constraint =>
        String(constraint.description || constraint.kind).includes('movementId')
      )
    ).toBe(true);
  });

  it('documents note target type aliases', () => {
    const noteTargets = DATA_MODEL_V2_3.notes.targetType;
    expect(noteTargets.canonicalValues).toEqual(
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
    expect(noteTargets.aliases).toMatchObject({
      movementnode: 'Movement',
      text: 'TextNode',
      media_asset: 'MediaAsset'
    });
  });
});
