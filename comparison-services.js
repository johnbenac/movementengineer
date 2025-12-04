/*
 * Comparison & Template Services for Religion Designer.
 *
 * These functions operate on plain JavaScript objects that follow:
 * - the v3.4 religion data model (data-model.js)
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
 * (dimension, religion) pair in the schema.
 *
 * @param {Object} schema  ComparisonSchema object
 * @param {string[]} religionIds  IDs of religions to compare
 * @param {Object} [options]  { id?, name?, description?, tags? }
 * @returns {Object} ComparisonBinding
 */
function createBlankBinding(schema, religionIds, options) {
  const opts = options || {};
  const relIds = normaliseArray(religionIds).filter(Boolean);

  const bindingId = opts.id || generateId('cmp-binding-');
  const name = opts.name || schema.name || 'Untitled Binding';
  const description = typeof opts.description === 'string'
    ? opts.description
    : (schema.description || null);
  const tags = normaliseArray(opts.tags);

  const cells = [];
  normaliseArray(schema.dimensions).forEach(dim => {
    if (!dim || !dim.id) return;
    relIds.forEach(religionId => {
      cells.push({
        dimensionId: dim.id,
        religionId,
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
    religionIds: relIds,
    cells
  };
}

/**
 * Return the cell for a given (dimensionId, religionId) pair,
 * or null if none exists.
 */
function getBindingCell(binding, dimensionId, religionId) {
  if (!binding || !Array.isArray(binding.cells)) return null;
  return (
    binding.cells.find(
      c => c.dimensionId === dimensionId && c.religionId === religionId
    ) || null
  );
}

/**
 * Return a new ComparisonBinding with a specific cell updated
 * or created. Does not mutate the original binding.
 */
function setBindingValue(binding, dimensionId, religionId, value, notes) {
  const base = binding || { cells: [], religionIds: [] };
  const relIds = normaliseArray(base.religionIds);
  const newReligionIds = relIds.includes(religionId)
    ? relIds.slice()
    : relIds.concat([religionId]);

  let found = false;
  const newCells = normaliseArray(base.cells).map(cell => {
    if (cell.dimensionId === dimensionId && cell.religionId === religionId) {
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
      religionId,
      value,
      notes: typeof notes === 'undefined' ? null : notes
    });
  }

  return {
    ...base,
    religionIds: newReligionIds,
    cells: newCells
  };
}

/**
 * Internal: derive an automatic value for a dimension/religion pair
 * based on sourceKind/sourceCollection/etc.
 *
 * This respects ADR-018: schemas hold only declarative hints; logic lives here.
 */
function deriveAutoValue(data, dimension, religionId) {
  if (!dimension || !data) return null;
  const sourceKind = dimension.sourceKind || 'none';
  if (sourceKind === 'none') return null;

  const collectionName = dimension.sourceCollection;
  if (!collectionName || !Array.isArray(data[collectionName])) return null;

  const includeShared = Boolean(dimension.includeShared);
  const filterTags = normaliseArray(dimension.sourceFilterTags);

  const items = data[collectionName];

  if (sourceKind === 'collection_count' || sourceKind === 'tagged_collection_count') {
    const matches = items.filter(item => {
      if (!item) return false;
      const matchesReligion =
        item.religionId === religionId ||
        (includeShared && item.religionId == null);

      if (!matchesReligion) return false;
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
  const relIds = binding ? normaliseArray(binding.religionIds) : [];
  const religionLookup = buildLookup(
    data && data.religions ? data.religions : [],
    'id'
  );

  const religions = relIds.map(id => {
    const rel = religionLookup.get(id);
    if (rel) {
      return {
        id: rel.id,
        name: rel.name,
        shortName: rel.shortName || rel.name || rel.id
      };
    }
    return { id, name: id, shortName: id };
  });

  const rows = dimensions.map(dim => {
    const cells = relIds.map(religionId => {
      const explicitCell = binding
        ? getBindingCell(binding, dim.id, religionId)
        : null;
      let value = explicitCell ? explicitCell.value : null;
      if (value == null) {
        value = deriveAutoValue(data, dim, religionId);
      }
      return {
        religionId,
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
    religions,
    rows
  };
}

/**
 * Apply a ReligionTemplate to a dataset to produce a new skeleton religion.
 *
 * This is intentionally conservative:
 * - It never mutates the input data.
 * - It only knows about collection/tag filtering and copy modes.
 * - It focuses on structural copying; detailed semantics can be extended later.
 *
 * @param {Object} data  Religion snapshot (arrays: religions, entities, practices, etc.)
 * @param {Object} template  ReligionTemplate
 * @param {Object} options  {
 *   sourceReligionId?,  // overrides template.sourceReligionId
 *   newReligionId?,     // if omitted, generated
 *   newReligionName?,
 *   newReligionShortName?,
 *   newReligionSummary?,
 *   extraReligionTags?
 * }
 */
function applyTemplateToReligion(data, template, options) {
  const srcData = data || {};
  const tmpl = template || { rules: [] };
  const opts = options || {};

  const sourceReligionId = opts.sourceReligionId || tmpl.sourceReligionId;
  if (!sourceReligionId) {
    throw new Error(
      'applyTemplateToReligion: sourceReligionId must be provided in options or template.'
    );
  }

  const religions = normaliseArray(srcData.religions);
  const sourceReligion = religions.find(r => r.id === sourceReligionId);
  if (!sourceReligion) {
    throw new Error(
      'applyTemplateToReligion: source religion not found: ' + sourceReligionId
    );
  }

  const newReligionId = opts.newReligionId || generateId('rel-template-');
  const extraTags = normaliseArray(opts.extraReligionTags);

  const newReligion = {
    id: newReligionId,
    name: opts.newReligionName || sourceReligion.name,
    shortName:
      opts.newReligionShortName ||
      sourceReligion.shortName ||
      sourceReligion.name,
    summary: opts.newReligionSummary || sourceReligion.summary,
    notes: sourceReligion.notes || null,
    tags: Array.from(
      new Set(
        normaliseArray(sourceReligion.tags).concat(extraTags)
      )
    )
  };

  // Shallow copy all collections to avoid mutating srcData
  const result = {
    religions: religions.concat([newReligion]),
    textCollections: normaliseArray(srcData.textCollections).slice(),
    texts: normaliseArray(srcData.texts).slice(),
    entities: normaliseArray(srcData.entities).slice(),
    practices: normaliseArray(srcData.practices).slice(),
    events: normaliseArray(srcData.events).slice(),
    rules: normaliseArray(srcData.rules).slice(),
    claims: normaliseArray(srcData.claims).slice(),
    media: normaliseArray(srcData.media).slice(),
    notes: normaliseArray(srcData.notes).slice(),
    relations: normaliseArray(srcData.relations).slice()
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
      if (!item || item.religionId !== sourceReligionId) return false;
      if (matchTags.length === 0) return true;
      const tags = normaliseArray(item.tags);
      return matchTags.some(tag => tags.indexOf(tag) !== -1);
    });

    const newItems = candidates.map(item => {
      const copy = { ...item };
      copy.id = generateId(collectionName.slice(0, 3) + '-tmpl-');
      copy.religionId = newReligionId;

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
  applyTemplateToReligion
};

if (typeof module !== 'undefined') {
  module.exports = ComparisonServices;
} else if (typeof window !== 'undefined') {
  window.ComparisonServices = ComparisonServices;
}
