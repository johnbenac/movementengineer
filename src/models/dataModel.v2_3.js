export const DATA_MODEL_V2_3 = {
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
    idCleaning: 'cleanId trims whitespace and unwraps [[id]] markers before use.',
    arrayNormalization: 'normaliseArray coerces non-arrays to [] and drops null/undefined.',
    crossMovementRefs: 'References are validated within the same movement; cross-movement refs are invalid.'
  },
  enums: {
    RuleKind: ['must_do', 'must_not_do', 'should_do', 'ideal'],
    EventRecurrence: ['once', 'daily', 'weekly', 'monthly', 'yearly', 'other'],
    PracticeKind: ['ritual', 'discipline', 'service', 'study'],
    MediaKind: ['image', 'audio', 'video', 'text', 'other'],
    NoteTargetType: [
      'Movement',
      'TextNode',
      'Entity',
      'Practice',
      'Event',
      'Rule',
      'Claim',
      'MediaAsset'
    ],
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
      description: 'Top-level movement containers.',
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
          default: null,
          description: 'Unique identifier for the movement.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: false,
          nullable: false,
          default: '<id>',
          description: 'Canonical movement id (defaults to id).',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Display name.'
        },
        shortName: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Short label for quick UI references.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the movement.',
          items: { type: 'string' }
        },
        status: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Status label.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        },
        summary: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body summary.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementIdEqualsId', description: 'movementId must equal id for movements.' }
      ]
    },
    textCollections: {
      typeName: 'TextCollection',
      description: 'Curated collections of texts within a movement.',
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
          default: null,
          description: 'Unique identifier for the text collection.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Display name.'
        },
        rootTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Top-level text ids included in the collection.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        description: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body description.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the collection.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementRef', description: 'movementId must reference an existing movement.' }
      ]
    },
    texts: {
      typeName: 'TextNode',
      description: 'Hierarchical text nodes within a movement.',
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
          default: null,
          description: 'Unique identifier for the text node.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        title: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Title of the text node.'
        },
        label: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional label.'
        },
        parentId: {
          type: 'string',
          format: 'id',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional parent text node id.',
          ref: 'texts'
        },
        mainFunction: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Primary function hint for UI.',
          enum: 'TextMainFunction'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the text node.',
          items: { type: 'string' }
        },
        mentionsEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Referenced entity ids mentioned in the text.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        },
        content: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body content.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementRef', description: 'movementId must reference an existing movement.' }
      ]
    },
    entities: {
      typeName: 'Entity',
      description: 'Entities such as beings, places, objects, or ideas.',
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
          default: null,
          description: 'Unique identifier for the entity.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Display name.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Entity kind label.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the entity.',
          items: { type: 'string' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source entity ids supporting this entity.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source descriptions.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        },
        summary: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body summary.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementRef', description: 'movementId must reference an existing movement.' }
      ]
    },
    practices: {
      typeName: 'Practice',
      description: 'Practices such as rituals, disciplines, or activities.',
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
          default: null,
          description: 'Unique identifier for the practice.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Display name.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Practice kind label.',
          enum: 'PracticeKind'
        },
        frequency: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Recurrence frequency.',
          enum: 'EventRecurrence'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the practice.',
          items: { type: 'string' }
        },
        involvedEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entity ids involved in the practice.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        instructionsTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Text ids describing instructions.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Claim ids supporting the practice.',
          items: { type: 'string', format: 'id', ref: 'claims' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entity ids for sources of truth.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source descriptions.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        },
        description: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body description.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementRef', description: 'movementId must reference an existing movement.' }
      ]
    },
    events: {
      typeName: 'Event',
      description: 'Events with recurrence and associated entities/practices.',
      collectionName: 'events',
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
          default: null,
          description: 'Unique identifier for the event.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Display name.'
        },
        recurrence: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Recurrence schedule.',
          enum: 'EventRecurrence'
        },
        timingRule: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Human-readable timing rules.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the event.',
          items: { type: 'string' }
        },
        mainPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Primary practice ids for the event.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        mainEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Primary entity ids for the event.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        readingTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Text ids associated with the event.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Claim ids supporting the event.',
          items: { type: 'string', format: 'id', ref: 'claims' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        },
        description: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body description.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementRef', description: 'movementId must reference an existing movement.' }
      ]
    },
    rules: {
      typeName: 'Rule',
      description: 'Norms with a rule kind and supporting references.',
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
          default: null,
          description: 'Unique identifier for the rule.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        shortText: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Short summary text for the rule.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Rule kind label.',
          enum: 'RuleKind'
        },
        details: {
          type: 'string',
          required: false,
          nullable: true,
          default: '',
          description: 'Markdown body details (front matter details accepted on import).'
        },
        appliesTo: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Applies-to categories.',
          items: { type: 'string' }
        },
        domain: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Domain categories.',
          items: { type: 'string' }
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the rule.',
          items: { type: 'string' }
        },
        supportingTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Text ids supporting the rule.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Claim ids supporting the rule.',
          items: { type: 'string', format: 'id', ref: 'claims' }
        },
        relatedPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Related practice ids.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entity ids for sources of truth.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source descriptions.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementRef', description: 'movementId must reference an existing movement.' }
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
          default: null,
          description: 'Unique identifier for the claim.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        text: {
          type: 'string',
          required: true,
          nullable: false,
          default: '',
          description: 'Claim text (front matter text or body on import).'
        },
        category: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional category.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the claim.',
          items: { type: 'string' }
        },
        aboutEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entity ids the claim is about.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourceTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source text ids for the claim.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source entity ids for the claim.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Source descriptions.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementRef', description: 'movementId must reference an existing movement.' },
        {
          kind: 'textRequired',
          description: 'text is required and may be sourced from front matter or body on import.'
        },
        {
          kind: 'exportPlacement',
          description: 'Export places text in front matter and body (current behavior).'
        }
      ]
    },
    media: {
      typeName: 'MediaAsset',
      description: 'Linked media artifacts.',
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
          default: null,
          description: 'Unique identifier for the media asset.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        kind: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Media kind label.',
          enum: 'MediaKind'
        },
        uri: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
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
          description: 'Tags applied to the media asset.',
          items: { type: 'string' }
        },
        linkedEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Linked entity ids.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        linkedPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Linked practice ids.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        linkedEventIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Linked event ids.',
          items: { type: 'string', format: 'id', ref: 'events' }
        },
        linkedTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Linked text ids.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        },
        description: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body description.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementRef', description: 'movementId must reference an existing movement.' }
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
          default: null,
          description: 'Unique identifier for the note.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Owning movement id.',
          ref: 'movements'
        },
        targetType: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Target type (canonicalized via aliases).',
          enum: 'NoteTargetType'
        },
        targetId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Id of the targeted record (polymorphic by targetType).'
        },
        author: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional author name.'
        },
        context: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional context description.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags applied to the note.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Sort order for display.'
        },
        body: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body text.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'canonicalizeTargetType',
          description: 'targetType is canonicalized using the alias map.'
        },
        {
          kind: 'targetExists',
          description: 'targetId must exist in the collection implied by canonical targetType.'
        },
        {
          kind: 'movementScopedRefs',
          description: 'Notes must target records within the same movement.'
        }
      ]
    }
  }
};

export default DATA_MODEL_V2_3;
