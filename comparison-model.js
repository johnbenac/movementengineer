{
  "version": "1.0",
  "enums": {
    "ComparisonValueKind": {
      "description": "Shape/type of the value held in a comparison cell for a given dimension and movement.",
      "values": [
        "text",
        "number",
        "boolean",
        "tag_list",
        "entity_ref",
        "entity_list",
        "practice_ref",
        "practice_list",
        "event_ref",
        "rule_ref",
        "claim_ref",
        "custom_json"
      ]
    },
    "ComparisonSourceKind": {
      "description": "How a comparison value can be derived automatically from a movement dataset.",
      "values": [
        "none",
        "collection_count",
        "tagged_collection_count"
      ]
    },
    "TemplateCopyMode": {
      "description": "How to copy objects when applying a MovementTemplate.",
      "values": [
        "copy_all_fields",
        "copy_structure_only",
        "reference_only",
        "ignore"
      ]
    }
  },
  "entities": {
    "ComparisonSchema": {
      "description": "Definition of a set of dimensions (aspects) used to compare multiple movements.",
      "collectionName": "comparisonSchemas",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "name": { "type": "string", "required": true },
        "description": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "dimensions": {
          "description": "Array of dimension objects { id, label, description?, valueKind, sourceKind, sourceCollection?, sourceFilterTags?, includeShared? }",
          "type": "array",
          "items": { "type": "object" },
          "required": true
        }
      }
    },
    "ComparisonBinding": {
      "description": "Matrix of values for a specific ComparisonSchema and a chosen set of movements.",
      "collectionName": "comparisonBindings",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "schemaId": {
          "type": "string",
          "format": "id",
          "ref": "ComparisonSchema",
          "required": true
        },
        "name": { "type": "string", "required": true },
        "description": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "movementIds": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "id",
            "ref": "Movement"
          },
          "required": true
        },
        "cells": {
          "description": "Array of cell objects { dimensionId, movementId, value, notes? }",
          "type": "array",
          "items": { "type": "object" },
          "required": true
        }
      }
    },
    "MovementTemplate": {
      "description": "Instructions for deriving a new skeleton movement from an existing one.",
      "collectionName": "movementTemplates",
      "fields": {
        "id": { "type": "string", "format": "id", "required": true },
        "name": { "type": "string", "required": true },
        "description": { "type": "string", "nullable": true },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "required": true
        },
        "sourceMovementId": {
          "type": "string",
          "format": "id",
          "ref": "Movement",
          "nullable": true
        },
        "rules": {
          "description": "Array of rule objects { id, collection, matchTags?, copyMode, fieldsToClear? }",
          "type": "array",
          "items": { "type": "object" },
          "required": true
        }
      }
    }
  }
}
