(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function listCollections(model) {
    if (Array.isArray(model.collectionOrder)) {
      return model.collectionOrder.slice();
    }
    return Object.keys(model.collections || {}).sort();
  }

  function resolveEnumValues(enumRef, model) {
    if (Array.isArray(enumRef)) return enumRef;
    if (typeof enumRef === 'string') {
      return model.enums && Array.isArray(model.enums[enumRef]) ? model.enums[enumRef] : null;
    }
    return null;
  }

  function createIssue({
    source = 'model',
    severity = 'error',
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
      source,
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

  function pushIssue(issues, issue, ctx) {
    issues.push(issue);
    if (ctx.maxIssues && issues.length >= ctx.maxIssues) {
      return false;
    }
    return true;
  }

  function validatePrimitiveType(value, fieldDef) {
    const type = fieldDef.type;
    if (type === 'string') {
      return typeof value === 'string';
    }
    if (type === 'number') {
      return typeof value === 'number' && !Number.isNaN(value);
    }
    if (type === 'boolean') {
      return typeof value === 'boolean';
    }
    if (type === 'array') {
      return Array.isArray(value);
    }
    return true;
  }

  function applyStringConstraints(value, fieldDef, collectionName, recordId, fieldPath, issues, ctx) {
    if (typeof value !== 'string') return true;
    if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
      return pushIssue(
        issues,
        createIssue({
          code: 'MIN_LENGTH',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Value is shorter than minLength ${fieldDef.minLength}.`,
          expected: fieldDef.minLength,
          actual: value.length
        }),
        ctx
      );
    }
    if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
      return pushIssue(
        issues,
        createIssue({
          code: 'MAX_LENGTH',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Value is longer than maxLength ${fieldDef.maxLength}.`,
          expected: fieldDef.maxLength,
          actual: value.length
        }),
        ctx
      );
    }
    if (fieldDef.pattern) {
      const pattern = fieldDef.pattern instanceof RegExp ? fieldDef.pattern : new RegExp(fieldDef.pattern);
      if (!pattern.test(value)) {
        return pushIssue(
          issues,
          createIssue({
            code: 'PATTERN',
            collection: collectionName,
            recordId,
            fieldPath,
            message: `Value does not match pattern ${pattern}.`,
            expected: pattern.toString(),
            actual: value
          }),
          ctx
        );
      }
    }
    return true;
  }

  function applyNumberConstraints(value, fieldDef, collectionName, recordId, fieldPath, issues, ctx) {
    if (typeof value !== 'number' || Number.isNaN(value)) return true;
    if (fieldDef.min !== undefined && value < fieldDef.min) {
      return pushIssue(
        issues,
        createIssue({
          code: 'MIN',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Value is less than min ${fieldDef.min}.`,
          expected: fieldDef.min,
          actual: value
        }),
        ctx
      );
    }
    if (fieldDef.max !== undefined && value > fieldDef.max) {
      return pushIssue(
        issues,
        createIssue({
          code: 'MAX',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Value is greater than max ${fieldDef.max}.`,
          expected: fieldDef.max,
          actual: value
        }),
        ctx
      );
    }
    return true;
  }

  function applyArrayConstraints(value, fieldDef, collectionName, recordId, fieldPath, issues, ctx) {
    if (!Array.isArray(value)) return true;
    if (fieldDef.minItems !== undefined && value.length < fieldDef.minItems) {
      return pushIssue(
        issues,
        createIssue({
          code: 'MIN_ITEMS',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Array has fewer than minItems ${fieldDef.minItems}.`,
          expected: fieldDef.minItems,
          actual: value.length
        }),
        ctx
      );
    }
    if (fieldDef.maxItems !== undefined && value.length > fieldDef.maxItems) {
      return pushIssue(
        issues,
        createIssue({
          code: 'MAX_ITEMS',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Array has more than maxItems ${fieldDef.maxItems}.`,
          expected: fieldDef.maxItems,
          actual: value.length
        }),
        ctx
      );
    }
    return true;
  }

  function validateValue(value, fieldDef, collectionName, recordId, fieldPath, issues, ctx) {
    if (!validatePrimitiveType(value, fieldDef)) {
      return pushIssue(
        issues,
        createIssue({
          code: 'TYPE',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Expected ${fieldDef.type} but received ${typeof value}.`,
          expected: fieldDef.type,
          actual: typeof value
        }),
        ctx
      );
    }

    if (fieldDef.enum) {
      const enumValues = resolveEnumValues(fieldDef.enum, ctx.model) || [];
      if (typeof value !== 'string' || !enumValues.includes(value)) {
        return pushIssue(
          issues,
          createIssue({
            code: 'ENUM',
            collection: collectionName,
            recordId,
            fieldPath,
            message: `Value is not in enum ${fieldDef.enum}.`,
            expected: enumValues,
            actual: value
          }),
          ctx
        );
      }
    }

    if (!applyStringConstraints(value, fieldDef, collectionName, recordId, fieldPath, issues, ctx)) {
      return false;
    }
    if (!applyNumberConstraints(value, fieldDef, collectionName, recordId, fieldPath, issues, ctx)) {
      return false;
    }
    if (!applyArrayConstraints(value, fieldDef, collectionName, recordId, fieldPath, issues, ctx)) {
      return false;
    }

    if (fieldDef.type === 'array' && fieldDef.items && Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const itemValue = value[i];
        const itemFieldPath = `${fieldPath}[${i}]`;
        if (!validateValue(itemValue, fieldDef.items, collectionName, recordId, itemFieldPath, issues, ctx)) {
          return false;
        }
      }
    }

    return true;
  }

  function validateRecord(record, collectionDef, ctx) {
    const issues = [];
    if (!record || typeof record !== 'object') {
      return issues;
    }
    const fields = collectionDef.fields || {};
    const collectionName = collectionDef.collectionName || collectionDef.typeName || 'unknown';
    const recordId = record.id;

    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      const value = record[fieldName];
      const fieldPath = fieldName;
      if (value === undefined) {
        if (fieldDef.required) {
          if (!pushIssue(
            issues,
            createIssue({
              code: 'REQUIRED',
              collection: collectionName,
              recordId,
              fieldPath,
              message: `Required field ${fieldName} is missing.`
            }),
            ctx
          )) {
            return issues;
          }
        }
        continue;
      }

      if (value === null) {
        if (!fieldDef.nullable) {
          if (!pushIssue(
            issues,
            createIssue({
              code: 'NULL_NOT_ALLOWED',
              collection: collectionName,
              recordId,
              fieldPath,
              message: `Field ${fieldName} cannot be null.`
            }),
            ctx
          )) {
            return issues;
          }
        }
        continue;
      }

      if (!validateValue(value, fieldDef, collectionName, recordId, fieldPath, issues, ctx)) {
        return issues;
      }
    }

    return issues;
  }

  function validateUniqueConstraints(snapshot, model, ctx) {
    const issues = [];
    listCollections(model).forEach(collectionName => {
      const collectionDef = model.collections[collectionName];
      const constraints = Array.isArray(collectionDef.constraints) ? collectionDef.constraints : [];
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      constraints
        .filter(constraint => constraint.kind === 'unique' && Array.isArray(constraint.fields))
        .forEach(constraint => {
          const seen = new Map();
          records.forEach(record => {
            const values = constraint.fields.map(field => record[field]);
            if (values.some(value => value === undefined || value === null)) {
              return;
            }
            const key = JSON.stringify(values);
            if (seen.has(key)) {
              const fieldPath = constraint.fields.join(',');
              pushIssue(
                issues,
                createIssue({
                  code: 'UNIQUE',
                  collection: collectionName,
                  recordId: record.id,
                  fieldPath,
                  message: `Duplicate values for unique constraint on ${fieldPath}.`,
                  expected: 'unique',
                  actual: values
                }),
                ctx
              );
              return;
            }
            seen.set(key, record.id);
          });
        });
    });
    return issues;
  }

  function validateDataset(snapshot, model, ctx) {
    const resolvedCtx = {
      ...ctx,
      model
    };
    const issues = [];
    listCollections(model).forEach(collectionName => {
      const collectionDef = model.collections[collectionName];
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      records.forEach(record => {
        const recordIssues = validateRecord(record, collectionDef, resolvedCtx);
        for (const issue of recordIssues) {
          if (!pushIssue(issues, issue, resolvedCtx)) {
            return;
          }
        }
      });
    });

    if (!resolvedCtx.maxIssues || issues.length < resolvedCtx.maxIssues) {
      const refIntegrity = getRefIntegrityModule();
      if (refIntegrity && refIntegrity.validateRefIntegrity) {
        const refIssues = refIntegrity.validateRefIntegrity(snapshot, model, resolvedCtx);
        for (const issue of refIssues) {
          if (!pushIssue(issues, issue, resolvedCtx)) {
            break;
          }
        }
      }
    }

    if (!resolvedCtx.maxIssues || issues.length < resolvedCtx.maxIssues) {
      const uniqueIssues = validateUniqueConstraints(snapshot, model, resolvedCtx);
      for (const issue of uniqueIssues) {
        if (!pushIssue(issues, issue, resolvedCtx)) {
          break;
        }
      }
    }

    const typesModule = getValidationTypesModule();
    if (typesModule && typesModule.createValidationReport) {
      return typesModule.createValidationReport('model', issues);
    }
    return { source: 'model', issues, summary: { errors: 0, warnings: 0, byCode: {}, byCollection: {} } };
  }

  function getRefIntegrityModule() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./refIntegrity');
    }
    return globalScope?.RefIntegrityValidator || {};
  }

  function getValidationTypesModule() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./validationTypes');
    }
    return globalScope?.ValidationTypes || {};
  }

  const api = {
    validateRecord,
    validateDataset
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.ModelValidator = api;
  }
})();
