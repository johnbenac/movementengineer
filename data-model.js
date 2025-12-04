{
  "version": "3.4",
  "enums": {
    "TextLevel": {
      "description": "How large a piece of text is.",
      "values": ["work", "section", "passage", "line"]
    },
    "TextFunction": {
      "description": "What a piece of text is mainly doing.",
      "values": [
        "story",
        "rule",
        "instructions",
        "teaching",
        "prayer_or_song",
        "commentary",
        "other"
      ]
    },
    "EntityKind": {
      "description": "Very general kind of thing in the world.",
      "values": ["being", "place", "object", "idea"]
    },
    "PracticeKind": {
      "description": "Very general kind of practice.",
      "values": ["ritual", "discipline", "service", "study"]
    },
    "RuleKind": {
      "description": "Strength/type of rule.",
      "values": ["must_do", "must_not_do", "should_do", "ideal"]
    },
    "EventRecurrence": {
      "description": "How often something usually happens.",
      "values": ["once", "daily", "weekly", "monthly", "yearly", "other"]
    },
    "MediaKind": {
      "description": "General type of media asset.",
      "values": ["image", "audio", "video", "text", "other"]
    }
  },
  "entities": {
    "Movement": {
      "description": "A movement or spiritual system being designed or described.",
      "collectionName": "movements",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "name": { "type": "string", "required": true },
        "shortName": { "type": "string", "required": true },
        "summary": { "type": "string", "required": true },
        "notes": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        }
      }
    },
    "TextCollection": {
      "description": "A named set of texts (e.g. 'Main Scriptures', 'Ritual Handbook').",
      "collectionName": "textCollections",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "required": true
        },
        "name": { "type": "string", "required": true },
        "description": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "rootTextIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "TextNode" },
          "required": true
        }
      }
    },
    "TextNode": {
      "description": "A piece of text: a whole work, a section, a passage, or a line. TextNodes form a tree. Links to other objects are one-way: texts record which entities they mention, but not which events or claims use them.",
      "collectionName": "texts",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "required": true
        },
        "parentId": {
          "type": "string",
          "format": "id",
          "ref": "TextNode",
          "nullable": true
        },
        "level": {
          "type": "enum",
          "enum": "TextLevel",
          "required": true
        },
        "title": { "type": "string", "required": true },
        "label": { "type": "string", "required": true },
        "content": { "type": "string", "nullable": true },
        "mainFunction": {
          "type": "enum",
          "enum": "TextFunction",
          "nullable": true
        },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "mentionsEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        }
      }
    },
    "Entity": {
      "description": "Anything that exists in the world of the movement: beings, places, objects, ideas. Relationships to other things are expressed via Relation records and one-way references from texts, practices, events, claims, and media.",
      "collectionName": "entities",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "nullable": true
        },
        "name": { "type": "string", "required": true },
        "kind": {
          "type": "enum",
          "enum": "EntityKind",
          "nullable": true
        },
        "summary": { "type": "string", "required": true },
        "notes": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "sourcesOfTruth": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "sourceEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        }
      }
    },
    "Practice": {
      "description": "Things people do as part of the movement: rituals, disciplines, service, study. Practices point outward to entities, texts, and claims; the reverse links are not stored on those objects.",
      "collectionName": "practices",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "required": true
        },
        "name": { "type": "string", "required": true },
        "kind": {
          "type": "enum",
          "enum": "PracticeKind",
          "nullable": true
        },
        "description": { "type": "string", "required": true },
        "frequency": {
          "type": "enum",
          "enum": "EventRecurrence",
          "required": true
        },
        "isPublic": { "type": "boolean", "required": true },
        "notes": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "involvedEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        },
        "instructionsTextIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "TextNode" },
          "required": true
        },
        "supportingClaimIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Claim" },
          "required": true
        },
        "sourcesOfTruth": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "sourceEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        }
      }
    },
    "Event": {
      "description": "Named times in the calendar: holidays, fasts, weekly meetings, life events. Events know which practices, entities, texts and claims they use; those objects do not keep symmetric back-links.",
      "collectionName": "events",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "required": true
        },
        "name": { "type": "string", "required": true },
        "description": { "type": "string", "required": true },
        "recurrence": {
          "type": "enum",
          "enum": "EventRecurrence",
          "required": true
        },
        "timingRule": { "type": "string", "required": true },
        "notes": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "mainPracticeIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Practice" },
          "required": true
        },
        "mainEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        },
        "readingTextIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "TextNode" },
          "required": true
        },
        "supportingClaimIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Claim" },
          "required": true
        }
      }
    },
    "Rule": {
      "description": "A rule or guideline: what people must / must not / should do, or ideals.",
      "collectionName": "rules",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "required": true
        },
        "shortText": { "type": "string", "required": true },
        "kind": {
          "type": "enum",
          "enum": "RuleKind",
          "required": true
        },
        "details": { "type": "string", "nullable": true },
        "appliesTo": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "domain": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "supportingTextIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "TextNode" },
          "required": true
        },
        "supportingClaimIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Claim" },
          "required": true
        },
        "relatedPracticeIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Practice" },
          "required": true
        },
        "sourcesOfTruth": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "sourceEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        }
      }
    },
    "Claim": {
      "description": "A statement about reality, gods, people, the afterlife, etc., tied to texts. Claims record their source texts and the entities they are about; texts do not mirror these links.",
      "collectionName": "claims",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "nullable": true
        },
        "text": { "type": "string", "required": true },
        "category": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "sourceTextIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "TextNode" },
          "required": true
        },
        "aboutEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        },
        "sourcesOfTruth": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "sourceEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        },
        "notes": { "type": "string", "nullable": true }
      }
    },
    "MediaAsset": {
      "description": "Image, icon, artwork, audio, video, etc., tied to movement content. MediaAssets point outward to the objects they depict or relate to.",
      "collectionName": "media",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "nullable": true
        },
        "kind": {
          "type": "enum",
          "enum": "MediaKind",
          "required": true
        },
        "uri": { "type": "string", "required": true },
        "title": { "type": "string", "required": true },
        "description": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "linkedEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        },
        "linkedPracticeIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Practice" },
          "required": true
        },
        "linkedEventIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Event" },
          "required": true
        },
        "linkedTextIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "TextNode" },
          "required": true
        }
      }
    },
    "Note": {
      "description": "Free-form commentary or explanation tied to any other object.",
      "collectionName": "notes",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "nullable": true
        },
        "targetType": { "type": "string", "required": true },
        "targetId": { "type": "string", "format": "id", "required": true },
        "author": { "type": "string", "nullable": true },
        "body": { "type": "string", "required": true },
        "context": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        }
      }
    },
    "Relation": {
      "description": "A typed relationship between two entities (for myth, hierarchy, membership, type-instance, etc.). Tools can infer 'general' vs 'particular' by conventions such as using relationType values like 'instance_of' or 'generalizes'.",
      "collectionName": "relations",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "movementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "nullable": true
        },
        "fromEntityId": {
          "type": "string",
          "format": "id",
          "ref": "Entity",
          "required": true
        },
        "toEntityId": {
          "type": "string",
          "format": "id",
          "ref": "Entity",
          "required": true
        },
        "relationType": {
          "type": "string",
          "required": true
        },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "supportingClaimIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Claim" },
          "required": true
        },
        "sourcesOfTruth": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "sourceEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "id", "ref": "Entity" },
          "required": true
        },
        "notes": {
          "type": "string",
          "nullable": true
        }
      }
    }
  }
}
