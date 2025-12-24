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
    idCleaning: 'cleanId() trims whitespace and unwraps [[id]] before use.',
    arrayNormalization: 'normaliseArray() converts non-arrays to [] and drops null/undefined entries.',
    crossMovementRefs: 'References are validated within the same movement as the source record.'
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
      canonicalValues: ['Movement', 'TextNode', 'Entity', 'Practice', 'Event', 'Rule', 'Claim', 'MediaAsset'],
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
      description: 'Top-level movement record used to scope all other collections.',
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
          description: 'Primary identifier for the movement.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: false,
          nullable: false,
          default: '<id>',
          description: 'Must match id; retained for compatibility with other collections.'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Full display name of the movement.'
        },
        shortName: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional abbreviated label.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Tags applied to the movement.'
        },
        status: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional status label.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
        },
        summary: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body summary of the movement.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementIdEqualsId', description: 'movementId must equal id.' }
      ]
    },
    textCollections: {
      typeName: 'TextCollection',
      description: 'Groups of text nodes within a movement.',
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
          description: 'Primary identifier for the text collection.'
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
          description: 'Display name for the collection.'
        },
        rootTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'texts' },
          description: 'Root texts for the collection.'
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
          items: { type: 'string' },
          description: 'Tags applied to the collection.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'References must resolve within the same movement.' }
      ]
    },
    texts: {
      typeName: 'TextNode',
      description: 'Individual text nodes within a collection hierarchy.',
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
          description: 'Primary identifier for the text node.'
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
          description: 'Display title for the text node.'
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
          description: 'Optional main function classification.',
          enum: 'TextMainFunction'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Tags applied to the text node.'
        },
        mentionsEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Entities referenced in the text.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
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
        { kind: 'movementScopedRefs', description: 'References must resolve within the same movement.' }
      ]
    },
    entities: {
      typeName: 'Entity',
      description: 'People, places, objects, or ideas referenced by a movement.',
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
          description: 'Primary identifier for the entity.'
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
          description: 'Display name for the entity.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional entity kind classification.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Tags applied to the entity.'
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Source entities that inform this record.'
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Source-of-truth descriptors.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
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
        { kind: 'movementScopedRefs', description: 'References must resolve within the same movement.' }
      ]
    },
    practices: {
      typeName: 'Practice',
      description: 'Rituals, disciplines, or activities carried out by a movement.',
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
          description: 'Primary identifier for the practice.'
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
          description: 'Display name for the practice.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Practice kind classification.',
          enum: 'PracticeKind'
        },
        frequency: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Recurrence descriptor for the practice.',
          enum: 'EventRecurrence'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Tags applied to the practice.'
        },
        involvedEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Entities involved in the practice.'
        },
        instructionsTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'texts' },
          description: 'Texts that describe the practice instructions.'
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'claims' },
          description: 'Claims that support the practice.'
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Source entities that informed the practice.'
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Source-of-truth descriptors.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
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
        { kind: 'movementScopedRefs', description: 'References must resolve within the same movement.' }
      ]
    },
    events: {
      typeName: 'Event',
      description: 'Scheduled or recurring events within a movement.',
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
          description: 'Primary identifier for the event.'
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
          description: 'Display name for the event.'
        },
        recurrence: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Recurrence descriptor for the event.',
          enum: 'EventRecurrence'
        },
        timingRule: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Freeform timing rule.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Tags applied to the event.'
        },
        mainPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'practices' },
          description: 'Primary practices associated with the event.'
        },
        mainEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Primary entities associated with the event.'
        },
        readingTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'texts' },
          description: 'Texts read during the event.'
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'claims' },
          description: 'Claims that support the event.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
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
        { kind: 'movementScopedRefs', description: 'References must resolve within the same movement.' }
      ]
    },
    rules: {
      typeName: 'Rule',
      description: 'Norms or rules governing movement behavior.',
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
          description: 'Primary identifier for the rule.'
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
          description: 'Short rule summary.'
        },
        kind: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Rule kind classification.',
          enum: 'RuleKind'
        },
        details: {
          type: 'string',
          required: false,
          nullable: true,
          default: '',
          description: 'Markdown body details (frontMatter.details is also accepted on import).'
        },
        appliesTo: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Rule applicability tags.'
        },
        domain: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Rule domain tags.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Tags applied to the rule.'
        },
        supportingTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'texts' },
          description: 'Texts that support the rule.'
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'claims' },
          description: 'Claims that support the rule.'
        },
        relatedPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'practices' },
          description: 'Practices related to the rule.'
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Source entities that informed the rule.'
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Source-of-truth descriptors.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'References must resolve within the same movement.' }
      ]
    },
    claims: {
      typeName: 'Claim',
      description: 'Boolean claims with supporting sources.',
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
          description: 'Primary identifier for the claim.'
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
          default: null,
          description: 'Claim text (import accepts front matter text or markdown body).'
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
          items: { type: 'string' },
          description: 'Tags applied to the claim.'
        },
        aboutEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Entities the claim is about.'
        },
        sourceTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'texts' },
          description: 'Texts that support the claim.'
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Source entities that informed the claim.'
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Source-of-truth descriptors.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'serializationNote',
          description: 'text is required; import accepts front matter or body, and export writes to both.'
        },
        { kind: 'movementScopedRefs', description: 'References must resolve within the same movement.' }
      ]
    },
    media: {
      typeName: 'MediaAsset',
      description: 'Linked media assets related to the movement.',
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
          description: 'Primary identifier for the media asset.'
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
          description: 'Media kind classification.',
          enum: 'MediaKind'
        },
        uri: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'URI for the media asset.'
        },
        title: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional title for the media asset.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string' },
          description: 'Tags applied to the media asset.'
        },
        linkedEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'entities' },
          description: 'Entities linked to the media asset.'
        },
        linkedPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'practices' },
          description: 'Practices linked to the media asset.'
        },
        linkedEventIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'events' },
          description: 'Events linked to the media asset.'
        },
        linkedTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          items: { type: 'string', format: 'id', ref: 'texts' },
          description: 'Texts linked to the media asset.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
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
        { kind: 'movementScopedRefs', description: 'References must resolve within the same movement.' }
      ]
    },
    notes: {
      typeName: 'Note',
      description: 'Annotations that attach to other records.',
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
          description: 'Primary identifier for the note.'
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
          description: 'Target collection type (canonicalized on import).',
          enum: 'NoteTargetType'
        },
        targetId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Target record id (collection inferred from targetType).'
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
          items: { type: 'string' },
          description: 'Tags applied to the note.'
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering value.'
        },
        body: {
          type: 'string',
          required: false,
          nullable: false,
          default: '',
          description: 'Markdown body for the note.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'global', fields: ['id'] },
        {
          kind: 'targetTypeCanonicalization',
          description: 'targetType is canonicalized using the alias map.'
        },
        {
          kind: 'polymorphicTarget',
          description: 'targetId must exist in the collection implied by the canonical targetType.'
        },
        {
          kind: 'movementScopedRefs',
          description: 'Note targets must exist within the same movement.'
        }
      ]
    }
  }
};

export default DATA_MODEL_V2_3;
