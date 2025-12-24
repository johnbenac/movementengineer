(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  function getValidationTypes() {
    if (isNode()) {
      return require('./validationTypes');
    }
    return globalScope?.ValidationTypes || null;
  }

  function getRefIntegrityModule() {
    if (isNode()) {
      return require('./refIntegrity');
    }
    return globalScope?.RefIntegrityValidator || null;
  }

  const { Severity, Source } = getValidationTypes() || {
    Severity: { ERROR: 'error', WARNING: 'warning' },
    Source: { LEGACY: 'legacy', MODEL: 'model' }
  };

  function listCollectionsFromModel(model) {
    if (!model || typeof model !== 'object') return [];
    if (Array.isArray(model.collectionOrder)) return model.collectionOrder.slice();
    if (Array.isArray(model.collectionsOrder)) return model.collectionsOrder.slice();
    return Object.keys(model.collections || {}).sort();
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function buildSummary(issues) {
    const summary = {
      errors: 0,
      warnings: 0,
      byCode: {},
      byCollection: {}
    };
    issues.forEach(issue => {
      if (issue.severity === Severity.WARNING) {
        summary.warnings += 1;
      } else {
        summary.errors += 1;
      }
      const code = issue.code || 'UNKNOWN';
      summary.byCode[code] = (summary.byCode[code] || 0) + 1;
      const collection = issue.collection || 'unknown';
      summary.byCollection[collection] = (summary.byCollection[collection] || 0) + 1;
    });
    return summary;
  }

  function createIssue({
    severity = Severity.ERROR,
    code,
    collection,
    recordId,
    fieldPath,
    message,
    expected,
    actual,
    meta
  }) {
    return {
      source: Source.MODEL,
      severity,
      code,
      collection,
      recordId,
      fieldPath,
      message,
      expected,
      actual,
      meta
    };
  }

  function describeValue(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '[object]';
    return String(value);
  }

  function checkType(value, type) {
    switch (type) {
      case 'string':
      case 'enum':
      case 'id':
      case 'ref':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && Number.isFinite(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value && typeof value === 'object' && !Array.isArray(value);
      default:
        return true;
    }
  }

  function resolveEnumValues(enumDef, model) {
    if (!enumDef) return null;
    if (Array.isArray(enumDef)) return enumDef;
    if (typeof enumDef === 'string') {
      return model?.enums?.[enumDef] || null;
    }
    return null;
  }

  function appendIssue(issues, ctx, issue) {
    issues.push(issue);
    if (ctx?.maxIssues && issues.length >= ctx.maxIssues) {
      return true;
    }
    return false;
  }

  function validateValue(value, fieldDef, info, issues, ctx) {
    const { collection, recordId, fieldPath, model } = info;

    if (value === undefined) {
      if (fieldDef.required) {
        return appendIssue(
          issues,
          ctx,
          createIssue({
            code: 'REQUIRED',
            collection,
            recordId,
            fieldPath,
            message: `${fieldPath} is required.`
          })
        );
      }
      return false;
    }

    if (value === null) {
      if (fieldDef.nullable) {
        return false;
      }
      return appendIssue(
        issues,
        ctx,
        createIssue({
          code: 'NULL_NOT_ALLOWED',
          collection,
          recordId,
          fieldPath,
          message: `${fieldPath} cannot be null.`,
          expected: fieldDef.type || 'value',
          actual: 'null'
        })
      );
    }

    const type = fieldDef.type || 'string';
    if (!checkType(value, type)) {
      return appendIssue(
        issues,
        ctx,
        createIssue({
          code: 'TYPE',
          collection,
          recordId,
          fieldPath,
          message: `${fieldPath} must be a ${type}.`,
          expected: type,
          actual: describeValue(value)
        })
      );
    }

    const enumValues = resolveEnumValues(fieldDef.enum, model);
    if (enumValues && typeof value === 'string' && !enumValues.includes(value)) {
      return appendIssue(
        issues,
        ctx,
        createIssue({
          code: 'ENUM',
          collection,
          recordId,
          fieldPath,
          message: `${fieldPath} must be one of ${enumValues.join(', ')}.`,
          expected: enumValues,
          actual: value,
          meta: { enumName: fieldDef.enum }
        })
      );
    }

    if (type === 'array' && Array.isArray(value) && fieldDef.items) {
      for (let i = 0; i < value.length; i += 1) {
        const item = value[i];
        const stop = validateValue(item, fieldDef.items, { ...info, fieldPath: `${fieldPath}[${i}]` }, issues, ctx);
        if (stop) return true;
      }
    }

    if (type === 'string') {
      if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
        if (
          appendIssue(
            issues,
            ctx,
            createIssue({
              code: 'MIN_LENGTH',
              collection,
              recordId,
              fieldPath,
              message: `${fieldPath} must be at least ${fieldDef.minLength} characters.`,
              expected: fieldDef.minLength,
              actual: value.length
            })
          )
        ) {
          return true;
        }
      }
      if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
        if (
          appendIssue(
            issues,
            ctx,
            createIssue({
              code: 'MAX_LENGTH',
              collection,
              recordId,
              fieldPath,
              message: `${fieldPath} must be at most ${fieldDef.maxLength} characters.`,
              expected: fieldDef.maxLength,
              actual: value.length
            })
          )
        ) {
          return true;
        }
      }
      if (fieldDef.pattern) {
        const regex = new RegExp(fieldDef.pattern);
        if (!regex.test(value)) {
          return appendIssue(
            issues,
            ctx,
            createIssue({
              code: 'PATTERN',
              collection,
              recordId,
              fieldPath,
              message: `${fieldPath} does not match pattern ${fieldDef.pattern}.`,
              expected: fieldDef.pattern,
              actual: value
            })
          );
        }
      }
    }

    if (type === 'number') {
      if (fieldDef.min !== undefined && value < fieldDef.min) {
        if (
          appendIssue(
            issues,
            ctx,
            createIssue({
              code: 'MIN',
              collection,
              recordId,
              fieldPath,
              message: `${fieldPath} must be at least ${fieldDef.min}.`,
              expected: fieldDef.min,
              actual: value
            })
          )
        ) {
          return true;
        }
      }
      if (fieldDef.max !== undefined && value > fieldDef.max) {
        if (
          appendIssue(
            issues,
            ctx,
            createIssue({
              code: 'MAX',
              collection,
              recordId,
              fieldPath,
              message: `${fieldPath} must be at most ${fieldDef.max}.`,
              expected: fieldDef.max,
              actual: value
            })
          )
        ) {
          return true;
        }
      }
    }

    if (type === 'array' && Array.isArray(value)) {
      if (fieldDef.minItems !== undefined && value.length < fieldDef.minItems) {
        if (
          appendIssue(
            issues,
            ctx,
            createIssue({
              code: 'MIN_ITEMS',
              collection,
              recordId,
              fieldPath,
              message: `${fieldPath} must have at least ${fieldDef.minItems} items.`,
              expected: fieldDef.minItems,
              actual: value.length
            })
          )
        ) {
          return true;
        }
      }
      if (fieldDef.maxItems !== undefined && value.length > fieldDef.maxItems) {
        if (
          appendIssue(
            issues,
            ctx,
            createIssue({
              code: 'MAX_ITEMS',
              collection,
              recordId,
              fieldPath,
              message: `${fieldPath} must have at most ${fieldDef.maxItems} items.`,
              expected: fieldDef.maxItems,
              actual: value.length
            })
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function validateRecord(record, collectionDef, ctx = {}) {
    const issues = [];
    if (!record || !collectionDef?.fields) return issues;

    const collectionName = collectionDef.collectionName || collectionDef.name || 'unknown';
    const recordId = record.id || undefined;

    Object.entries(collectionDef.fields).forEach(([fieldName, fieldDef]) => {
      if (ctx.maxIssues && issues.length >= ctx.maxIssues) return;
      const fieldPath = fieldName;
      const value = record[fieldName];
      validateValue(value, fieldDef, { collection: collectionName, recordId, fieldPath, model: ctx.model }, issues, ctx);
    });

    return issues;
  }

  function validateUniqueConstraints(snapshot, model, ctx) {
    const issues = [];
    const collections = listCollectionsFromModel(model);

    collections.forEach(collectionName => {
      const collectionDef = model.collections?.[collectionName];
      if (!collectionDef?.constraints) return;
      const records = ensureArray(snapshot?.[collectionName]);

      collectionDef.constraints.forEach(constraint => {
        if (constraint.kind !== 'unique') return;
        const fields = Array.isArray(constraint.fields) ? constraint.fields : [];
        if (!fields.length) return;
        const seen = new Map();
        records.forEach(record => {
          if (ctx.maxIssues && issues.length >= ctx.maxIssues) return;
          const key = fields.map(field => record?.[field]).join('::');
          if (!key) return;
          if (seen.has(key)) {
            appendIssue(
              issues,
              ctx,
              createIssue({
                code: 'UNIQUE',
                collection: collectionName,
                recordId: record?.id,
                fieldPath: fields.join(','),
                message: `Duplicate unique key for ${fields.join(', ')}: ${key}.`,
                expected: 'unique',
                actual: key
              })
            );
          } else {
            seen.set(key, record?.id || true);
          }
        });
      });
    });

    return issues;
  }

  function validateDataset(snapshot, model, ctx = {}) {
    const issues = [];
    const collections = listCollectionsFromModel(model);

    collections.forEach(collectionName => {
      if (ctx.maxIssues && issues.length >= ctx.maxIssues) return;
      const collectionDef = model.collections?.[collectionName];
      const records = ensureArray(snapshot?.[collectionName]);
      records.forEach(record => {
        if (ctx.maxIssues && issues.length >= ctx.maxIssues) return;
        const remaining = ctx.maxIssues ? ctx.maxIssues - issues.length : null;
        const recordIssues = validateRecord(record, collectionDef, { ...ctx, maxIssues: remaining || ctx.maxIssues });
        if (remaining !== null && recordIssues.length > remaining) {
          issues.push(...recordIssues.slice(0, remaining));
        } else {
          issues.push(...recordIssues);
        }
      });
    });

    const refIntegrity = getRefIntegrityModule();
    if (refIntegrity?.validateRefIntegrity) {
      const remaining = ctx.maxIssues ? ctx.maxIssues - issues.length : null;
      if (remaining === null || remaining > 0) {
        const refIssues = refIntegrity.validateRefIntegrity(snapshot, model, { ...ctx, maxIssues: remaining || ctx.maxIssues });
        issues.push(...refIssues.slice(0, remaining || refIssues.length));
      }
    }

    const remaining = ctx.maxIssues ? ctx.maxIssues - issues.length : null;
    if (remaining === null || remaining > 0) {
      const uniqueIssues = validateUniqueConstraints(snapshot, model, { ...ctx, maxIssues: remaining || ctx.maxIssues });
      issues.push(...uniqueIssues.slice(0, remaining || uniqueIssues.length));
    }

    return {
      source: Source.MODEL,
      issues,
      summary: buildSummary(issues)
    };
  }

  const ModelValidator = {
    validateRecord,
    validateDataset
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelValidator;
  }
  if (globalScope) {
    globalScope.ModelValidator = ModelValidator;
  }
})();
