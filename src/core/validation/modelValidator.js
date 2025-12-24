(function () {
  'use strict';

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  const validationTypes = isNode()
    ? require('./validationTypes')
    : globalThis?.MovementEngineerValidation?.validationTypes;
  const refIntegrity = isNode()
    ? require('./refIntegrity')
    : globalThis?.MovementEngineerValidation?.refIntegrity;

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isValidNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function addIssue(issues, issue, ctx) {
    issues.push(issue);
    if (ctx?.maxIssues && issues.length >= ctx.maxIssues) {
      return false;
    }
    return true;
  }

  function issueBase(record, collectionName, fieldPath) {
    return {
      source: 'model',
      severity: 'error',
      collection: collectionName,
      recordId: record?.id,
      fieldPath
    };
  }

  function reportTypeIssue(issues, record, collectionName, fieldPath, expected, actual, ctx) {
    return addIssue(
      issues,
      {
        ...issueBase(record, collectionName, fieldPath),
        code: 'TYPE',
        message: `Expected ${expected} but received ${actual}.`,
        expected,
        actual
      },
      ctx
    );
  }

  function validateEnum(issues, record, collectionName, fieldPath, fieldDef, value, ctx) {
    if (!fieldDef.enum || typeof value !== 'string') return true;
    const enumValues = ctx?.model?.enums?.[fieldDef.enum];
    if (!Array.isArray(enumValues)) return true;
    if (!enumValues.includes(value)) {
      return addIssue(
        issues,
        {
          ...issueBase(record, collectionName, fieldPath),
          code: 'ENUM',
          message: `Value "${value}" is not in enum ${fieldDef.enum}.`,
          expected: enumValues,
          actual: value,
          meta: { enumName: fieldDef.enum }
        },
        ctx
      );
    }
    return true;
  }

  function validateConstraints(issues, record, collectionName, fieldPath, fieldDef, value, ctx) {
    if (typeof value === 'string') {
      if (fieldDef.pattern) {
        const regex = new RegExp(fieldDef.pattern);
        if (!regex.test(value)) {
          if (!addIssue(
            issues,
            {
              ...issueBase(record, collectionName, fieldPath),
              code: 'PATTERN',
              message: `Value does not match pattern ${fieldDef.pattern}.`,
              expected: fieldDef.pattern,
              actual: value
            },
            ctx
          )) {
            return false;
          }
        }
      }
      if (typeof fieldDef.minLength === 'number' && value.length < fieldDef.minLength) {
        if (!addIssue(
          issues,
          {
            ...issueBase(record, collectionName, fieldPath),
            code: 'MIN_LENGTH',
            message: `Value length ${value.length} is less than ${fieldDef.minLength}.`,
            expected: fieldDef.minLength,
            actual: value.length
          },
          ctx
        )) {
          return false;
        }
      }
      if (typeof fieldDef.maxLength === 'number' && value.length > fieldDef.maxLength) {
        if (!addIssue(
          issues,
          {
            ...issueBase(record, collectionName, fieldPath),
            code: 'MAX_LENGTH',
            message: `Value length ${value.length} exceeds ${fieldDef.maxLength}.`,
            expected: fieldDef.maxLength,
            actual: value.length
          },
          ctx
        )) {
          return false;
        }
      }
    }

    if (isValidNumber(value)) {
      if (typeof fieldDef.min === 'number' && value < fieldDef.min) {
        if (!addIssue(
          issues,
          {
            ...issueBase(record, collectionName, fieldPath),
            code: 'MIN',
            message: `Value ${value} is less than ${fieldDef.min}.`,
            expected: fieldDef.min,
            actual: value
          },
          ctx
        )) {
          return false;
        }
      }
      if (typeof fieldDef.max === 'number' && value > fieldDef.max) {
        if (!addIssue(
          issues,
          {
            ...issueBase(record, collectionName, fieldPath),
            code: 'MAX',
            message: `Value ${value} exceeds ${fieldDef.max}.`,
            expected: fieldDef.max,
            actual: value
          },
          ctx
        )) {
          return false;
        }
      }
    }

    if (Array.isArray(value)) {
      if (typeof fieldDef.minItems === 'number' && value.length < fieldDef.minItems) {
        if (!addIssue(
          issues,
          {
            ...issueBase(record, collectionName, fieldPath),
            code: 'MIN_ITEMS',
            message: `Array length ${value.length} is less than ${fieldDef.minItems}.`,
            expected: fieldDef.minItems,
            actual: value.length
          },
          ctx
        )) {
          return false;
        }
      }
      if (typeof fieldDef.maxItems === 'number' && value.length > fieldDef.maxItems) {
        if (!addIssue(
          issues,
          {
            ...issueBase(record, collectionName, fieldPath),
            code: 'MAX_ITEMS',
            message: `Array length ${value.length} exceeds ${fieldDef.maxItems}.`,
            expected: fieldDef.maxItems,
            actual: value.length
          },
          ctx
        )) {
          return false;
        }
      }
    }

    return true;
  }

  function validateValue(issues, record, collectionName, fieldPath, fieldDef, value, ctx) {
    if (value === undefined) {
      if (fieldDef.required) {
        return addIssue(
          issues,
          {
            ...issueBase(record, collectionName, fieldPath),
            code: 'REQUIRED',
            message: 'Required field is missing.'
          },
          ctx
        );
      }
      return true;
    }

    if (value === null) {
      if (fieldDef.nullable) return true;
      return addIssue(
        issues,
        {
          ...issueBase(record, collectionName, fieldPath),
          code: 'NULL_NOT_ALLOWED',
          message: 'Null is not allowed for this field.'
        },
        ctx
      );
    }

    switch (fieldDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          return reportTypeIssue(issues, record, collectionName, fieldPath, 'string', typeof value, ctx);
        }
        break;
      case 'number':
        if (!isValidNumber(value)) {
          return reportTypeIssue(issues, record, collectionName, fieldPath, 'number', typeof value, ctx);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return reportTypeIssue(issues, record, collectionName, fieldPath, 'boolean', typeof value, ctx);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return reportTypeIssue(issues, record, collectionName, fieldPath, 'array', typeof value, ctx);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return reportTypeIssue(issues, record, collectionName, fieldPath, 'object', typeof value, ctx);
        }
        break;
      default:
        break;
    }

    if (fieldDef.type === 'array' && Array.isArray(value) && fieldDef.items) {
      for (let i = 0; i < value.length; i += 1) {
        const itemValue = value[i];
        if (!validateValue(issues, record, collectionName, `${fieldPath}[${i}]`, fieldDef.items, itemValue, ctx)) {
          return false;
        }
      }
      return true;
    }

    if (!validateEnum(issues, record, collectionName, fieldPath, fieldDef, value, ctx)) {
      return false;
    }

    return validateConstraints(issues, record, collectionName, fieldPath, fieldDef, value, ctx);
  }

  function validateRecord(record, collectionDef, ctx) {
    const issues = [];
    if (!collectionDef || typeof collectionDef !== 'object') return issues;
    const fields = collectionDef.fields || {};
    const collectionName = collectionDef.collectionName || 'unknown';

    Object.entries(fields).some(([fieldName, fieldDef]) => {
      const value = record ? record[fieldName] : undefined;
      return !validateValue(issues, record, collectionName, fieldName, fieldDef, value, ctx);
    });

    return issues;
  }

  function validateUniqueConstraints(snapshot, model, ctx) {
    const issues = [];
    Object.entries(model.collections || {}).some(([collectionName, collectionDef]) => {
      const constraints = toArray(collectionDef.constraints).filter(c => c?.kind === 'unique');
      if (!constraints.length) return false;
      const records = toArray(snapshot?.[collectionName]);
      constraints.forEach(constraint => {
        const fields = toArray(constraint.fields);
        if (!fields.length) return;
        const seen = new Map();
        records.forEach(record => {
          const key = JSON.stringify(fields.map(field => record?.[field] ?? null));
          if (seen.has(key)) {
            addIssue(
              issues,
              {
                source: 'model',
                severity: 'error',
                collection: collectionName,
                recordId: record?.id,
                fieldPath: fields.join(', '),
                code: 'UNIQUE',
                message: `Duplicate unique values for ${fields.join(', ')}.`,
                expected: fields,
                actual: fields.reduce((acc, field) => {
                  acc[field] = record?.[field];
                  return acc;
                }, {}),
                meta: {
                  scope: constraint.scope || 'global'
                }
              },
              ctx
            );
          } else {
            seen.set(key, record?.id || null);
          }
        });
      });
      return ctx?.maxIssues && issues.length >= ctx.maxIssues;
    });
    return issues;
  }

  function validateDataset(snapshot, model, ctx = {}) {
    const issues = [];
    if (!model || !model.collections) {
      return validationTypes.createReport('model', issues);
    }
    const collections = model.collectionOrder || Object.keys(model.collections).sort();

    for (const collectionName of collections) {
      const collectionDef = model.collections[collectionName];
      const records = snapshot?.[collectionName];
      const recordList = Array.isArray(records) ? records : [];

      if (!Array.isArray(records) && records !== undefined) {
        if (!addIssue(
          issues,
          {
            source: 'model',
            severity: 'error',
            collection: collectionName,
            fieldPath: '__collection__',
            code: 'TYPE',
            message: 'Collection must be an array.',
            expected: 'array',
            actual: typeof records
          },
          ctx
        )) {
          break;
        }
      }

      for (const record of recordList) {
        const recordIssues = validateRecord(record, collectionDef, ctx);
        for (const issue of recordIssues) {
          if (!addIssue(issues, issue, ctx)) {
            break;
          }
        }
        if (ctx.maxIssues && issues.length >= ctx.maxIssues) {
          break;
        }
      }
      if (ctx.maxIssues && issues.length >= ctx.maxIssues) {
        break;
      }
    }

    if (!ctx.maxIssues || issues.length < ctx.maxIssues) {
      const refIssues = refIntegrity?.validateRefIntegrity
        ? refIntegrity.validateRefIntegrity(snapshot, model, ctx)
        : [];
      refIssues.forEach(issue => addIssue(issues, issue, ctx));
    }

    if (!ctx.maxIssues || issues.length < ctx.maxIssues) {
      const uniqueIssues = validateUniqueConstraints(snapshot, model, ctx);
      uniqueIssues.forEach(issue => addIssue(issues, issue, ctx));
    }

    return validationTypes.createReport('model', issues);
  }

  const ModelValidator = {
    validateRecord,
    validateDataset
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelValidator;
  }

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  if (globalScope) {
    const namespace = (globalScope.MovementEngineerValidation =
      globalScope.MovementEngineerValidation || {});
    namespace.modelValidator = ModelValidator;
  }
})();
