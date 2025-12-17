/*
 * Comparison & Template Services for Movement Engineer.
 *
 * These functions operate on plain JavaScript objects that follow:
 * - the v3.5 movement data model (data-model.js)
 * - the comparison/meta models (comparison-model.js, ADR-018)
 *
 * They are pure and environment-agnostic: no DOM, no fetch, no FS.
 */

function normaliseArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildLookup(items, key) {
  const map = new Map();
  normaliseArray(items).forEach(item => {
    if (item && item[key]) {
      map.set(item[key], item);
    }
  });
  return map;
}

function generateId(prefix) {
  const base = prefix || 'id-';
  return base + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a ComparisonBinding with empty cells for every
 * (dimension, movement) pair in the schema.
 *
 * @param {Object} schema  ComparisonSchema object
 * @param {string[]} movementIds  IDs of movements to compare
 * @param {Object} [options]  { id?, name?, description?, tags? }
 * @returns {Object} ComparisonBinding
 */
function createBlankBinding(schema, movementIds, options) {
  const opts = options || {};
  const movementIdsNormalised = normaliseArray(movementIds).filter(Boolean);

  const bindingId = opts.id || generateId('cmp-binding-');
  const name = opts.name || schema.name || 'Untitled Binding';
  const description = typeof opts.description === 'string'
    ? opts.description
    : (schema.description || null);
  const tags = normaliseArray(opts.tags);

  const cells = [];
  normaliseArray(schema.dimensions).forEach(dim => {
    if (!dim || !dim.id) return;
    movementIdsNormalised.forEach(movementId => {
      cells.push({
        dimensionId: dim.id,
        movementId,
        value: null,
        notes: null
      });
    });
  });

  return {
    id: bindingId,
    schemaId: schema.id,
    name,
    description,
    tags,
    movementIds: movementIdsNormalised,
    cells
  };
}

/**
 * Return the cell for a given (dimensionId, movementId) pair,
 * or null if none exists.
 */
function getBindingCell(binding, dimensionId, movementId) {
  if (!binding || !Array.isArray(binding.cells)) return null;
  return (
    binding.cells.find(
      c => c.dimensionId === dimensionId && c.movementId === movementId
    ) || null
  );
}

/**
 * Return a new ComparisonBinding with a specific cell updated
 * or created. Does not mutate the original binding.
 */
function setBindingValue(binding, dimensionId, movementId, value, notes) {
  const base = binding || { cells: [], movementIds: [] };
  const movementIds = normaliseArray(base.movementIds);
  const newMovementIds = movementIds.includes(movementId)
    ? movementIds.slice()
    : movementIds.concat([movementId]);

  let found = false;
  const newCells = normaliseArray(base.cells).map(cell => {
    if (cell.dimensionId === dimensionId && cell.movementId === movementId) {
      found = true;
      return {
        ...cell,
        value,
        notes: typeof notes === 'undefined' ? cell.notes : notes
      };
    }
    return cell;
  });

  if (!found) {
    newCells.push({
      dimensionId,
      movementId,
      value,
      notes: typeof notes === 'undefined' ? null : notes
    });
  }

  return {
    ...base,
    movementIds: newMovementIds,
    cells: newCells
  };
}

/**
 * Internal: derive an automatic value for a dimension/movement pair
 * based on sourceKind/sourceCollection/etc.
 *
 * This respects ADR-018: schemas hold only declarative hints; logic lives here.
 */
function deriveAutoValue(data, dimension, movementId) {
  if (!dimension || !data) return null;
  const sourceKind = dimension.sourceKind || 'none';
  if (sourceKind === 'none') return null;

  const collectionName = dimension.sourceCollection;
  if (!collectionName || !Array.isArray(data[collectionName])) return null;

  const filterTags = normaliseArray(dimension.sourceFilterTags);

  const items = data[collectionName];

  if (sourceKind === 'collection_count' || sourceKind === 'tagged_collection_count') {
    const matches = items.filter(item => {
      if (!item) return false;
      if (item.movementId !== movementId) return false;
      if (sourceKind === 'tagged_collection_count' && filterTags.length > 0) {
        const tags = normaliseArray(item.tags);
        return filterTags.some(tag => tags.indexOf(tag) !== -1);
      }
      return true;
    });
    return matches.length;
  }

  // Future: other sourceKind modes can be added here.
  return null;
}

/**
 * Build a comparison matrix view-model for the UI.
 *
 * It combines:
 * - schema.dimensions
 * - binding.cells (explicit values)
 * - auto-derived values for dimensions with sourceKind!=none
 *
 * Explicit binding values always override auto-derived ones.
 */
function buildComparisonMatrix(data, schema, binding) {
  const safeSchema = schema || { id: null, name: null, dimensions: [] };
  const dimensions = normaliseArray(safeSchema.dimensions);
  const movementIds = binding ? normaliseArray(binding.movementIds) : [];
  const movementLookup = buildLookup(
    data && data.movements ? data.movements : [],
    'id'
  );

  const movements = movementIds.map(id => {
    const movement = movementLookup.get(id);
    if (movement) {
      return {
        id: movement.id,
        name: movement.name,
        shortName: movement.shortName || movement.name || movement.id
      };
    }
    return { id, name: id, shortName: id };
  });

  const rows = dimensions.map(dim => {
    const cells = movementIds.map(movementId => {
      const explicitCell = binding
        ? getBindingCell(binding, dim.id, movementId)
        : null;
      let value = explicitCell ? explicitCell.value : null;
      if (value == null) {
        value = deriveAutoValue(data, dim, movementId);
      }
      return {
        movementId,
        value
      };
    });

    return {
      dimensionId: dim.id,
      label: dim.label || dim.id,
      description: dim.description || null,
      valueKind: dim.valueKind || 'text',
      cells
    };
  });

  return {
    schemaId: safeSchema.id || null,
    schemaName: safeSchema.name || null,
    movements,
    rows
  };
}

/**
 * Apply a MovementTemplate to a dataset to produce a new skeleton movement.
 *
 * This is intentionally conservative:
 * - It never mutates the input data.
 * - It only knows about collection/tag filtering and copy modes.
 * - It focuses on structural copying; detailed semantics can be extended later.
 *
 * @param {Object} data  Movement snapshot (arrays: movements, entities, practices, etc.)
 * @param {Object} template  MovementTemplate
 * @param {Object} options  {
 *   sourceMovementId?,  // overrides template.sourceMovementId
 *   newMovementId?,     // if omitted, generated
 *   newMovementName?,
 *   newMovementShortName?,
 *   newMovementSummary?,
 *   extraMovementTags?
 * }
 */
function applyTemplateToMovement(data, template, options) {
  const srcData = data || {};
  const tmpl = template || { rules: [] };
  const opts = options || {};

  const sourceMovementId = opts.sourceMovementId || tmpl.sourceMovementId;
  if (!sourceMovementId) {
    throw new Error(
      'applyTemplateToMovement: sourceMovementId must be provided in options or template.'
    );
  }

  const movements = normaliseArray(srcData.movements);
  const sourceMovement = movements.find(r => r.id === sourceMovementId);
  if (!sourceMovement) {
    throw new Error(
      'applyTemplateToMovement: source movement not found: ' + sourceMovementId
    );
  }

  const newMovementId = opts.newMovementId || generateId('mov-template-');
  const extraTags = normaliseArray(opts.extraMovementTags);

  const newMovement = {
    id: newMovementId,
    name: opts.newMovementName || sourceMovement.name,
    shortName:
      opts.newMovementShortName ||
      sourceMovement.shortName ||
      sourceMovement.name,
    summary: opts.newMovementSummary || sourceMovement.summary,
    notes: sourceMovement.notes || null,
    tags: Array.from(
      new Set(
        normaliseArray(sourceMovement.tags).concat(extraTags)
      )
    )
  };

  // Shallow copy all collections to avoid mutating srcData
    const result = {
      movements: movements.concat([newMovement]),
      textCollections: normaliseArray(srcData.textCollections).slice(),
      texts: normaliseArray(srcData.texts).slice(),
      entities: normaliseArray(srcData.entities).slice(),
      practices: normaliseArray(srcData.practices).slice(),
      events: normaliseArray(srcData.events).slice(),
      rules: normaliseArray(srcData.rules).slice(),
      claims: normaliseArray(srcData.claims).slice(),
      media: normaliseArray(srcData.media).slice(),
      notes: normaliseArray(srcData.notes).slice()
    };

  const rules = normaliseArray(tmpl.rules);
  rules.forEach(rule => {
    const collectionName = rule.collection;
    const copyMode = rule.copyMode || 'copy_all_fields';

    if (!collectionName || !Object.prototype.hasOwnProperty.call(result, collectionName)) {
      return;
    }

    // For now, ignore 'reference_only' and 'ignore' in terms of object creation.
    if (copyMode === 'ignore' || copyMode === 'reference_only') {
      return;
    }

    const originalItems = normaliseArray(srcData[collectionName]);
    const matchTags = normaliseArray(rule.matchTags);
    const fieldsToClear = normaliseArray(rule.fieldsToClear);

    const candidates = originalItems.filter(item => {
      if (!item || item.movementId !== sourceMovementId) return false;
      if (matchTags.length === 0) return true;
      const tags = normaliseArray(item.tags);
      return matchTags.some(tag => tags.indexOf(tag) !== -1);
    });

    const newItems = candidates.map(item => {
      const copy = { ...item };
      copy.id = generateId(collectionName.slice(0, 3) + '-tmpl-');
      copy.movementId = newMovementId;

      if (copyMode === 'copy_structure_only') {
        const defaultFieldsToClear = [
          'summary',
          'notes',
          'content',
          'sourcesOfTruth',
          'sourceEntityIds'
        ];
        const clearFields = Array.from(
          new Set(defaultFieldsToClear.concat(fieldsToClear))
        );

        clearFields.forEach(field => {
          if (Object.prototype.hasOwnProperty.call(copy, field)) {
            const v = copy[field];
            if (Array.isArray(v)) copy[field] = [];
            else if (typeof v === 'string') copy[field] = '';
            else copy[field] = null;
          }
        });
      }

      return copy;
    });

    result[collectionName] = result[collectionName].concat(newItems);
  });

  return result;
}

const ComparisonServices = {
  normaliseArray,
  buildLookup,
  createBlankBinding,
  getBindingCell,
  setBindingValue,
  buildComparisonMatrix,
  applyTemplateToMovement
};

if (typeof module !== 'undefined') {
  module.exports = ComparisonServices;
} else if (typeof window !== 'undefined') {
  window.ComparisonServices = ComparisonServices;
}
