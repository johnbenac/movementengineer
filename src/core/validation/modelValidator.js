(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function getValidationTypes() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./validationTypes');
    }
    return globalScope?.ValidationTypes || null;
  }

  function getRefIntegrity() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./refIntegrity');
    }
    return globalScope?.RefIntegrity || null;
  }

  const validationTypes = getValidationTypes();
  const refIntegrity = getRefIntegrity();

  function listCollections(model) {
    if (!model) return [];
    if (Array.isArray(model.collectionOrder)) return model.collectionOrder.slice();
    return Object.keys(model.collections || {}).sort();
  }

  function resolveCollectionName(model, ref) {
    if (!ref || !model || !model.collections) return null;
    if (model.collections[ref]) return ref;
    const entries = Object.values(model.collections);
    const match = entries.find(entry => entry.collectionName === ref || entry.typeName === ref);
    return match?.collectionName || null;
  }

  function isNullOrUndefined(value) {
    return value === null || value === undefined;
  }

  function describeType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  function resolveEnumValues(fieldDef, model) {
    if (!fieldDef || !fieldDef.enum || !model?.enums) return null;
    return model.enums[fieldDef.enum] || null;
  }

  function shouldStop(ctx, issues) {
    if (!ctx || !ctx.maxIssues) return false;
    return issues.length >= ctx.maxIssues;
  }

  function pushIssue(issues, issue, ctx) {
    if (!issue) return;
    if (shouldStop(ctx, issues)) return;
    issues.push(issue);
  }

  function validateScalar({ value, fieldDef, collectionName, recordId, fieldPath, model, issues, ctx }) {
    if (!fieldDef || isNullOrUndefined(value)) return;
    const type = fieldDef.type || 'string';
    let validType = true;

    switch (type) {
      case 'string':
      case 'id':
      case 'enum':
        validType = typeof value === 'string';
        break;
      case 'number':
        validType = typeof value === 'number' && Number.isFinite(value);
        break;
      case 'boolean':
        validType = typeof value === 'boolean';
        break;
      case 'array':
        validType = Array.isArray(value);
        break;
      default:
        validType = true;
        break;
    }

    if (!validType) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'TYPE',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Expected ${type}, received ${describeType(value)}.`,
          expected: type,
          actual: describeType(value)
        }),
        ctx
      );
      return;
    }

    const enumValues = resolveEnumValues(fieldDef, model);
    if (enumValues && typeof value === 'string' && !enumValues.includes(value)) {
      pushIssue(
        issues,
        validationTypes.createIssue({
          source: 'model',
          severity: 'error',
          code: 'ENUM',
          collection: collectionName,
          recordId,
          fieldPath,
          message: `Value "${value}" is not a valid enum member for ${fieldDef.enum}.`,
          expected: enumValues.slice(),
          actual: value,
          meta: { enumName: fieldDef.enum }
        }),
        ctx
      );
    }

    if (typeof value === 'string') {
      if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'MIN_LENGTH',
            collection: collectionName,
            recordId,
            fieldPath,
            message: `String is shorter than minimum length ${fieldDef.minLength}.`,
            expected: fieldDef.minLength,
            actual: value.length
          }),
          ctx
        );
      }
      if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'MAX_LENGTH',
            collection: collectionName,
            recordId,
            fieldPath,
            message: `String exceeds maximum length ${fieldDef.maxLength}.`,
            expected: fieldDef.maxLength,
            actual: value.length
          }),
          ctx
        );
      }
      if (fieldDef.pattern) {
        const regex = fieldDef.pattern instanceof RegExp ? fieldDef.pattern : new RegExp(fieldDef.pattern);
        if (!regex.test(value)) {
          pushIssue(
            issues,
            validationTypes.createIssue({
              source: 'model',
              severity: 'error',
              code: 'PATTERN',
              collection: collectionName,
              recordId,
              fieldPath,
              message: `String does not match required pattern ${regex}.`,
              expected: regex.toString(),
              actual: value
            }),
            ctx
          );
        }
      }
    }

    if (typeof value === 'number') {
      if (fieldDef.min !== undefined && value < fieldDef.min) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'MIN',
            collection: collectionName,
            recordId,
            fieldPath,
            message: `Number is below minimum ${fieldDef.min}.`,
            expected: fieldDef.min,
            actual: value
          }),
          ctx
        );
      }
      if (fieldDef.max !== undefined && value > fieldDef.max) {
        pushIssue(
          issues,
          validationTypes.createIssue({
            source: 'model',
            severity: 'error',
            code: 'MAX',
            collection: collectionName,
            recordId,
            fieldPath,
            message: `Number exceeds maximum ${fieldDef.max}.`,
            expected: fieldDef.max,
            actual: value
          }),
          ctx
        );
      }
    }
  }

  function validateRecord(record, collectionDef, ctx = {}) {
    const issues = [];
    if (!record || !collectionDef || !collectionDef.fields) return issues;

    const model = ctx.model;
    const collectionName = collectionDef.collectionName || collectionDef.collection || collectionDef.typeName;
    const recordId = record.id || undefined;

    Object.entries(collectionDef.fields).forEach(([fieldName, fieldDef]) => {
      if (shouldStop(ctx, issues)) return;
      const value = record[fieldName];
      const fieldPath = fieldName;

      if (value === undefined) {
        if (fieldDef.required) {
          pushIssue(
            issues,
            validationTypes.createIssue({
              source: 'model',
              severity: 'error',
              code: 'REQUIRED',
              collection: collectionName,
              recordId,
              fieldPath,
              message: `Missing required field ${fieldName}.`
            }),
            ctx
          );
        }
        return;
      }

      if (value === null) {
        if (!fieldDef.nullable) {
          pushIssue(
            issues,
            validationTypes.createIssue({
              source: 'model',
              severity: 'error',
              code: 'NULL_NOT_ALLOWED',
              collection: collectionName,
              recordId,
              fieldPath,
              message: `Field ${fieldName} does not allow null values.`,
              expected: 'non-null',
              actual: null
            }),
            ctx
          );
        }
        return;
      }

      if ((fieldDef.type || 'string') === 'array') {
        if (!Array.isArray(value)) {
          validateScalar({
            value,
            fieldDef,
            collectionName,
            recordId,
            fieldPath,
            model,
            issues,
            ctx
          });
          return;
        }

        if (fieldDef.minItems !== undefined && value.length < fieldDef.minItems) {
          pushIssue(
            issues,
            validationTypes.createIssue({
              source: 'model',
              severity: 'error',
              code: 'MIN_ITEMS',
              collection: collectionName,
              recordId,
              fieldPath,
              message: `Array has fewer than ${fieldDef.minItems} items.`,
              expected: fieldDef.minItems,
              actual: value.length
            }),
            ctx
          );
        }
        if (fieldDef.maxItems !== undefined && value.length > fieldDef.maxItems) {
          pushIssue(
            issues,
            validationTypes.createIssue({
              source: 'model',
              severity: 'error',
              code: 'MAX_ITEMS',
              collection: collectionName,
              recordId,
              fieldPath,
              message: `Array exceeds ${fieldDef.maxItems} items.`,
              expected: fieldDef.maxItems,
              actual: value.length
            }),
            ctx
          );
        }

        const itemDef = fieldDef.items || {};
        value.forEach((itemValue, index) => {
          if (shouldStop(ctx, issues)) return;
          const itemPath = `${fieldName}[${index}]`;
          if (itemValue === null) {
            pushIssue(
              issues,
              validationTypes.createIssue({
                source: 'model',
                severity: 'error',
                code: 'NULL_NOT_ALLOWED',
                collection: collectionName,
                recordId,
                fieldPath: itemPath,
                message: `Array item for ${fieldName} cannot be null.`,
                expected: 'non-null',
                actual: null
              }),
              ctx
            );
            return;
          }
          validateScalar({
            value: itemValue,
            fieldDef: itemDef,
            collectionName,
            recordId,
            fieldPath: itemPath,
            model,
            issues,
            ctx
          });
        });

        return;
      }

      validateScalar({
        value,
        fieldDef,
        collectionName,
        recordId,
        fieldPath,
        model,
        issues,
        ctx
      });
    });

    if (ctx.snapshot && ctx.model && refIntegrity?.validateRecordRefs) {
      const refIssues = refIntegrity.validateRecordRefs(record, collectionDef, ctx.snapshot, ctx.model, ctx);
      refIssues.forEach(issue => pushIssue(issues, issue, ctx));
    }

    return issues;
  }

  function validateUniqueConstraints(snapshot, model, ctx = {}) {
    const issues = [];
    if (!snapshot || !model || !model.collections) return issues;

    listCollections(model).forEach(collectionName => {
      const collectionDef = model.collections[collectionName];
      if (!collectionDef || !Array.isArray(collectionDef.constraints)) return;
      const uniqueConstraints = collectionDef.constraints.filter(c => c.kind === 'unique');
      if (uniqueConstraints.length === 0) return;
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];

      uniqueConstraints.forEach(constraint => {
        if (shouldStop(ctx, issues)) return;
        const fields = Array.isArray(constraint.fields) ? constraint.fields : [];
        if (fields.length === 0) return;
        const seen = new Map();

        records.forEach(record => {
          if (shouldStop(ctx, issues)) return;
          const keyParts = fields.map(field => (record ? record[field] : undefined));
          const key = JSON.stringify(keyParts);
          if (seen.has(key)) {
            pushIssue(
              issues,
              validationTypes.createIssue({
                source: 'model',
                severity: 'error',
                code: 'UNIQUE',
                collection: collectionName,
                recordId: record?.id,
                fieldPath: fields.join(','),
                message: `Duplicate values for unique constraint on ${fields.join(', ')}.`,
                expected: 'unique',
                actual: keyParts,
                meta: { fields, scope: constraint.scope || 'global' }
              }),
              ctx
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
    if (!snapshot || !model || !model.collections) {
      return {
        source: 'model',
        issues: [],
        summary: validationTypes.buildSummary([])
      };
    }

    const collections = listCollections(model);
    collections.forEach(collectionName => {
      if (shouldStop(ctx, issues)) return;
      const collectionDef = model.collections[collectionName];
      const records = Array.isArray(snapshot[collectionName]) ? snapshot[collectionName] : [];
      records.forEach(record => {
        if (shouldStop(ctx, issues)) return;
        const recordIssues = validateRecord(record, collectionDef, ctx);
        recordIssues.forEach(issue => pushIssue(issues, issue, ctx));
      });
    });

    if (refIntegrity?.validateRefIntegrity) {
      const refIssues = refIntegrity.validateRefIntegrity(snapshot, model, ctx);
      refIssues.forEach(issue => pushIssue(issues, issue, ctx));
    }

    const uniqueIssues = validateUniqueConstraints(snapshot, model, ctx);
    uniqueIssues.forEach(issue => pushIssue(issues, issue, ctx));

    return {
      source: 'model',
      issues,
      summary: validationTypes.buildSummary(issues)
    };
  }

  const api = {
    validateRecord,
    validateDataset,
    resolveCollectionName
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.ModelValidator = api;
  }
})();
