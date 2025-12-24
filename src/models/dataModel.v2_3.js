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
    idCleaning: 'cleanId() trims whitespace and unwraps [[id]] into id.',
    arrayNormalization: 'normaliseArray() maps non-arrays to [] and drops nullish entries.',
    crossMovementRefs: 'Reference validation only checks targets within the same movement.'
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
          default: null,
          description: 'Unique movement identifier.'
        },
        movementId: {
          type: 'string',
          format: 'id',
          required: false,
          nullable: false,
          default: '<id>',
          description: 'Movement identifier (compiler defaults to id).'
        },
        name: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Display name for the movement.'
        },
        shortName: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Short label for compact UI contexts.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
          items: { type: 'string' }
        },
        status: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Status string or phase.'
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
        { kind: 'equality', description: 'movementId must equal id for movements.' }
      ]
    },
    textCollections: {
      typeName: 'TextCollection',
      description: 'Named collections of texts with designated roots.',
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
          ref: 'movements',
          description: 'Owning movement identifier.'
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
          description: 'Root text node IDs.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
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
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'rootTextIds must belong to the same movement.' }
      ]
    },
    texts: {
      typeName: 'TextNode',
      description: 'Individual text nodes, optionally nested via parentId.',
      collectionName: 'texts',
      serialization: {
        frontMatterFields: ['id', 'movementId', 'title', 'label', 'parentId', 'mainFunction', 'tags', 'mentionsEntityIds', 'order'],
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
          ref: 'movements',
          description: 'Owning movement identifier.'
        },
        title: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'Primary title for the text node.'
        },
        label: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Secondary label for the text node.'
        },
        parentId: {
          type: 'string',
          format: 'id',
          required: false,
          nullable: true,
          default: null,
          ref: 'texts',
          description: 'Optional parent text node ID.'
        },
        mainFunction: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          enum: 'TextMainFunction',
          description: 'Documented main function for the text node.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
          items: { type: 'string' }
        },
        mentionsEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entity IDs mentioned in the text.',
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
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'parentId and mentionsEntityIds must belong to the same movement.' }
      ]
    },
    entities: {
      typeName: 'Entity',
      description: 'Beings, places, objects, or ideas referenced by a movement.',
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
          ref: 'movements',
          description: 'Owning movement identifier.'
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
          description: 'Optional entity kind (not enforced).'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
          items: { type: 'string' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entity IDs that are sources for this entity.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Freeform source citations.',
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
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'sourceEntityIds must belong to the same movement.' }
      ]
    },
    practices: {
      typeName: 'Practice',
      description: 'Rituals, disciplines, activities, or service practices.',
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
          ref: 'movements',
          description: 'Owning movement identifier.'
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
          enum: 'PracticeKind',
          description: 'Documented practice kind.'
        },
        frequency: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          enum: 'EventRecurrence',
          description: 'Optional recurrence or frequency.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
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
          description: 'Instructional texts for the practice.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Claims supporting the practice.',
          items: { type: 'string', format: 'id', ref: 'claims' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entities that act as sources for this practice.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Freeform source citations.',
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
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'Referenced entities, texts, and claims must belong to the same movement.' }
      ]
    },
    events: {
      typeName: 'Event',
      description: 'Events or recurring happenings in a movement.',
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
          ref: 'movements',
          description: 'Owning movement identifier.'
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
          enum: 'EventRecurrence',
          description: 'Recurrence or timing cadence.'
        },
        timingRule: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Additional timing rule or note.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
          items: { type: 'string' }
        },
        mainPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Primary practices involved in the event.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        mainEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Primary entities involved in the event.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        readingTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Texts read or cited during the event.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Claims supporting the event.',
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
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'Referenced entities, practices, texts, and claims must belong to the same movement.' }
      ]
    },
    rules: {
      typeName: 'Rule',
      description: 'Norms or prescriptions for a movement.',
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
          ref: 'movements',
          description: 'Owning movement identifier.'
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
          enum: 'RuleKind',
          description: 'Documented rule kind.'
        },
        appliesTo: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags indicating who or what the rule applies to.',
          items: { type: 'string' }
        },
        domain: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Domains or scopes for the rule.',
          items: { type: 'string' }
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
          items: { type: 'string' }
        },
        supportingTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Texts supporting the rule.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        supportingClaimIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Claims supporting the rule.',
          items: { type: 'string', format: 'id', ref: 'claims' }
        },
        relatedPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Practices related to the rule.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entities that act as sources for this rule.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Freeform source citations.',
          items: { type: 'string' }
        },
        order: {
          type: 'number',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional ordering hint.'
        },
        details: {
          type: 'string',
          required: false,
          nullable: true,
          default: '',
          description: 'Markdown details stored in the body (import also accepts frontMatter.details).'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'Referenced entities, practices, texts, and claims must belong to the same movement.' }
      ]
    },
    claims: {
      typeName: 'Claim',
      description: 'Boolean assertions tied to texts or entities.',
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
          ref: 'movements',
          description: 'Owning movement identifier.'
        },
        text: {
          type: 'string',
          required: true,
          nullable: false,
          default: '',
          description: 'Claim text (import accepts front matter or body; export writes both).'
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
          description: 'Tags for filtering and grouping.',
          items: { type: 'string' }
        },
        aboutEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entity IDs the claim is about.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourceTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Texts that source the claim.',
          items: { type: 'string', format: 'id', ref: 'texts' }
        },
        sourceEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entities that source the claim.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        sourcesOfTruth: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Freeform source citations.',
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
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        {
          kind: 'serialization',
          description: 'text is required and may be sourced from front matter or body on import; export writes text to both.'
        }
      ]
    },
    media: {
      typeName: 'MediaAsset',
      description: 'Linked media resources associated with movement content.',
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
          ref: 'movements',
          description: 'Owning movement identifier.'
        },
        kind: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          enum: 'MediaKind',
          description: 'Media type (image, audio, etc.).'
        },
        uri: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          description: 'URI or path to the media asset.'
        },
        title: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional display title.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
          items: { type: 'string' }
        },
        linkedEntityIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Entities linked to the media asset.',
          items: { type: 'string', format: 'id', ref: 'entities' }
        },
        linkedPracticeIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Practices linked to the media asset.',
          items: { type: 'string', format: 'id', ref: 'practices' }
        },
        linkedEventIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Events linked to the media asset.',
          items: { type: 'string', format: 'id', ref: 'events' }
        },
        linkedTextIds: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Texts linked to the media asset.',
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
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'Linked entities, practices, events, and texts must belong to the same movement.' }
      ]
    },
    notes: {
      typeName: 'Note',
      description: 'Annotations linked to any core record type.',
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
          ref: 'movements',
          description: 'Owning movement identifier.'
        },
        targetType: {
          type: 'string',
          required: true,
          nullable: false,
          default: null,
          enum: 'NoteTargetType',
          description: 'Canonical note target type (aliases allowed on import).'
        },
        targetId: {
          type: 'string',
          format: 'id',
          required: true,
          nullable: false,
          default: null,
          description: 'Target record ID, resolved based on targetType.'
        },
        author: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Author or source of the note.'
        },
        context: {
          type: 'string',
          required: false,
          nullable: true,
          default: null,
          description: 'Optional contextual snippet.'
        },
        tags: {
          type: 'array',
          required: false,
          nullable: false,
          default: [],
          description: 'Tags for filtering and grouping.',
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
          description: 'Markdown body text for the note.'
        }
      },
      constraints: [
        { kind: 'unique', scope: 'movement', fields: ['id'] },
        { kind: 'movementScopedRefs', description: 'Notes must target records in the same movement.' },
        { kind: 'noteTarget', description: 'targetType is canonicalized via alias map; targetId must exist in the implied collection.' }
      ]
    }
  }
};

export default DATA_MODEL_V2_3;
