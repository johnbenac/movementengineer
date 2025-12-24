(function () {
  'use strict';

  const DATA_MODEL_V2_3 = {
  specVersion: '2.3',
  collectionsOrder: [
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
  ],
  normalization: {
    idCleaning: 'cleanId() trims values and unwraps [[id]] tokens before use.',
    arrayNormalization: 'normaliseArray() coerces non-arrays to [] and removes null/undefined values.',
    crossMovementRefs: 'References are validated within the same movement; cross-movement refs are invalid.'
  },
  enums: {
    RuleKind: ['must_do', 'must_not_do', 'should_do', 'ideal'],
    EventRecurrence: ['once', 'daily', 'weekly', 'monthly', 'yearly', 'other'],
    PracticeKind: ['ritual', 'discipline', 'service', 'study'],
    MediaKind: ['image', 'audio', 'video', 'text', 'other'],
    NoteTargetType: ['Movement', 'TextNode', 'Entity', 'Practice', 'Event', 'Rule', 'Claim', 'MediaAsset'],
    TextMainFunction: ['work', 'section', 'passage', 'line']
  },
  notes: {
    targetType: {
      canonicalValues: [
        'Movement',
        'TextNode',
        'Entity',
        'Practice',
        'Event',
        'Rule',
        'Claim',
        'MediaAsset'
      ],
      aliases: {
        movement: 'Movement',
        movementnode: 'Movement',
        textnode: 'TextNode',
        text: 'TextNode',
        entity: 'Entity',
        practice: 'Practice',
        event: 'Event',
        rule: 'Rule',
        claim: 'Claim',
        media: 'MediaAsset',
        mediaasset: 'MediaAsset',
        media_asset: 'MediaAsset'
      }
    }
  },
  collections: {
    movements: {
      typeName: 'Movement',
      description: 'Top-level movement metadata and summary.',
      collectionName: 'movements',
      serialization: {
        frontMatterFields: ['id', 'movementId', 'name', 'shortName', 'tags', 'status', 'order'],
        bodyField: 'summary'
      },
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique movement identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: false,
          nullable: false,
          default: '<id>',
          description: 'Defaults to id; must equal id.'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Display name for the movement.'
        },
        shortName: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional abbreviated name.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        status: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Status label for the movement.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        },
        summary: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown summary stored in the body.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'movementIdMatchesId',
          description: 'movementId must equal id for movement records.'
        }
      ]
    },
    textCollections: {
      typeName: 'TextCollection',
      description: 'Groupings of related text nodes within a movement.',
      collectionName: 'textCollections',
      serialization: {
        frontMatterFields: ['id', 'movementId', 'name', 'rootTextIds', 'description', 'tags', 'order'],
        bodyField: 'description'
      },
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique text collection identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Display name for the collection.'
        },
        rootTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Top-level text nodes in the collection.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        description: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown description stored in the body.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'movementScopedRefs',
          description: 'rootTextIds must reference text nodes within the same movement.'
        }
      ]
    },
    texts: {
      typeName: 'TextNode',
      description: 'Text nodes that can form a hierarchy inside a movement.',
      collectionName: 'texts',
      serialization: {
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
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique text node identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        title: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Title for the text node.'
        },
        label: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional short label.'
        },
        parentId: {
          type: 'string',
          format: 'id',
          required: false,
          nullable: true,
          default: null,
          description: 'Parent text node id.',
          ref: 'texts'
        },
        mainFunction: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional text function hint.',
          ui: { enum: 'TextMainFunction' }
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        mentionsEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Referenced entities mentioned in the text.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        },
        content: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown content stored in the body.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'movementScopedRefs',
          description: 'parentId and mentionsEntityIds must reference records in the same movement.'
        }
      ]
    },
    entities: {
      typeName: 'Entity',
      description: 'People, places, objects, ideas, or other entities.',
      collectionName: 'entities',
      serialization: {
        frontMatterFields: ['id', 'movementId', 'name', 'kind', 'tags', 'sourceEntityIds', 'sourcesOfTruth', 'order'],
        bodyField: 'summary'
      },
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique entity identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Entity name.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional entity kind.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source entities of truth.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source of truth labels.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        },
        summary: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown summary stored in the body.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] }
      ]
    },
    practices: {
      typeName: 'Practice',
      description: 'Rituals, disciplines, or recurring practices.',
      collectionName: 'practices',
      serialization: {
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
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique practice identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Practice name.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional practice kind.',
          enum: 'PracticeKind'
        },
        frequency: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional recurrence hint.',
          enum: 'EventRecurrence'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        involvedEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entities involved in the practice.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        instructionsTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Text nodes containing instructions.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Supporting claims.',
          items: { type: 'string', format: 'id', ref: 'claims' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source entities of truth.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source of truth labels.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        },
        description: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown description stored in the body.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'movementScopedRefs',
          description: 'Referenced ids must exist within the same movement.'
        }
      ]
    },
    events: {
      typeName: 'Event',
      description: 'Events and recurring happenings.',
      collectionName: 'events',
      ui: {
        views: ['calendar', 'detail'],
        defaultView: 'calendar'
      },
      serialization: {
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
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique event identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Event name.'
        },
        recurrence: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional recurrence hint.',
          enum: 'EventRecurrence'
        },
        timingRule: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional timing rule.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        mainPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Primary practices for the event.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        mainEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Primary entities for the event.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        readingTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Text readings for the event.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Supporting claims for the event.',
          items: { type: 'string', format: 'id', ref: 'claims' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        },
        description: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown description stored in the body.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'movementScopedRefs',
          description: 'Referenced ids must exist within the same movement.'
        }
      ]
    },
    rules: {
      typeName: 'Rule',
      description: 'Norms or rules enforced by the movement.',
      collectionName: 'rules',
      serialization: {
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
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique rule identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        shortText: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Short rule text.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional rule kind.',
          enum: 'RuleKind'
        },
        details: {
          type: 'string',
          required: false,
          nullable: true,
          default: '',
          description:
            'Markdown details stored in the body (front matter details are also accepted on import).'
        },
        appliesTo: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Target subjects for the rule.',
          items: { type: 'string' }
        },
        domain: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Domain tags for the rule.',
          items: { type: 'string' }
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        supportingTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Supporting text nodes.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Supporting claims.',
          items: { type: 'string', format: 'id', ref: 'claims' }
        },
        relatedPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Related practices.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source entities of truth.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source of truth labels.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'movementScopedRefs',
          description: 'Referenced ids must exist within the same movement.'
        }
      ]
    },
    claims: {
      typeName: 'Claim',
      description: 'Boolean assertions with sources.',
      collectionName: 'claims',
      serialization: {
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
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique claim identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        text: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Claim text (front matter text or body on import).'
        },
        category: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional claim category.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        aboutEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entities referenced by the claim.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourceTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source text nodes.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source entities of truth.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source of truth labels.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'movementScopedRefs',
          description: 'Referenced ids must exist within the same movement.'
        },
        {
          kind: 'textFromBodyOrFrontMatter',
          description: 'text is required and may be sourced from front matter or body on import; exporter writes both.'
        }
      ]
    },
    media: {
      typeName: 'MediaAsset',
      description: 'Linked media assets (images, audio, video, etc.).',
      collectionName: 'media',
      serialization: {
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
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique media identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        kind: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Media kind.',
          enum: 'MediaKind'
        },
        uri: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Media URI.'
        },
        title: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional title.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        linkedEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Linked entities.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        linkedPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Linked practices.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        linkedEventIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Linked events.',
          items: { type: 'string', format: 'id', ref: 'events' }
        },
        linkedTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Linked texts.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        },
        description: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown description stored in the body.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'movementScopedRefs',
          description: 'Referenced ids must exist within the same movement.'
        }
      ]
    },
    notes: {
      typeName: 'Note',
      description: 'Annotations attached to other records.',
      collectionName: 'notes',
      serialization: {
        frontMatterFields: ['id', 'movementId', 'targetType', 'targetId', 'author', 'context', 'tags', 'order'],
        bodyField: 'body'
      },
      fields: {
        id: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Unique note identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        targetType: {
          type: 'string',
          required: true,
          nullable: false,
          description: 'Target collection type (canonicalized via alias map).',
          enum: 'NoteTargetType'
        },
        targetId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          description: 'Target record id (polymorphic by targetType).'
        },
        author: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional author attribution.'
        },
        context: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional context for the note.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tag list for filtering.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        },
        body: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body stored in the note file.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'noteTargetCanonicalization',
          description: 'targetType is canonicalized using the alias map.'
        },
        {
          kind: 'noteTargetExists',
          description: 'targetId must exist in the collection implied by canonical targetType.'
        },
        {
          kind: 'movementScopedRefs',
          description: 'Note targets must belong to the same movement.'
        }
      ]
    }
  }
};

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  if (globalScope) {
    globalScope.DATA_MODEL_V2_3 = DATA_MODEL_V2_3;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA_MODEL_V2_3;
  }
})();
