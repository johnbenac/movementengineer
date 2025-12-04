const ComparisonServices = require('./comparison-services');
const baseData = require('./sample-data');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testCreateBlankBinding() {
  const schema = {
    id: 'schema-basic',
    name: 'Basic Counts',
    description: 'Counts of core collections.',
    tags: [],
    dimensions: [
      {
        id: 'entity_count',
        label: 'Entities',
        description: 'Number of entities for this religion.',
        valueKind: 'number',
        sourceKind: 'collection_count',
        sourceCollection: 'entities',
        sourceFilterTags: [],
        includeShared: false
      },
      {
        id: 'practice_count',
        label: 'Practices',
        description: 'Number of practices for this religion.',
        valueKind: 'number',
        sourceKind: 'collection_count',
        sourceCollection: 'practices',
        sourceFilterTags: [],
        includeShared: false
      }
    ]
  };

  const binding = ComparisonServices.createBlankBinding(schema, ['rel-test']);

  assert(binding.schemaId === 'schema-basic', 'Binding should reference schema id');
  assert(binding.religionIds.length === 1, 'Binding should include one religion');
  assert(binding.religionIds[0] === 'rel-test', 'Binding religion should be rel-test');
  assert(Array.isArray(binding.cells), 'Binding.cells should be an array');
  assert(binding.cells.length === 2, 'There should be one cell per dimension for rel-test');

  binding.cells.forEach(cell => {
    assert(cell.value === null, 'New binding cells should start with null value');
  });
}

function testSetBindingValueIsPure() {
  const schema = {
    id: 'schema-basic',
    name: 'Basic Counts',
    dimensions: [
      {
        id: 'entity_count',
        label: 'Entities',
        valueKind: 'number',
        sourceKind: 'collection_count',
        sourceCollection: 'entities',
        sourceFilterTags: [],
        includeShared: false
      }
    ]
  };

  const binding = ComparisonServices.createBlankBinding(schema, ['rel-test']);
  const originalCell = binding.cells[0];

  const updated = ComparisonServices.setBindingValue(
    binding,
    'entity_count',
    'rel-test',
    42,
    'Manual override'
  );

  const updatedCell = updated.cells.find(
    c => c.dimensionId === 'entity_count' && c.religionId === 'rel-test'
  );

  assert(
    originalCell.value === null,
    'Original binding must remain unchanged (value null)'
  );
  assert(
    updatedCell.value === 42,
    'Updated binding should contain the new value'
  );
  assert(
    updatedCell.notes === 'Manual override',
    'Updated binding should store notes when provided'
  );
}

function testBuildComparisonMatrixAutoCounts() {
  const schema = {
    id: 'schema-basic',
    name: 'Basic Counts',
    dimensions: [
      {
        id: 'entity_count',
        label: 'Entities',
        valueKind: 'number',
        sourceKind: 'collection_count',
        sourceCollection: 'entities',
        sourceFilterTags: [],
        includeShared: false
      },
      {
        id: 'practice_count',
        label: 'Practices',
        valueKind: 'number',
        sourceKind: 'collection_count',
        sourceCollection: 'practices',
        sourceFilterTags: [],
        includeShared: false
      }
    ]
  };

  const binding = ComparisonServices.createBlankBinding(schema, ['rel-test']);
  const matrix = ComparisonServices.buildComparisonMatrix(baseData, schema, binding);

  assert(matrix.schemaId === 'schema-basic', 'Matrix should reference schema id');
  assert(matrix.religions.length === 1, 'There should be one religion in the matrix');
  assert(matrix.religions[0].id === 'rel-test', 'Religion id should be rel-test');
  assert(matrix.rows.length === 2, 'There should be a row per dimension');

  const entityRow = matrix.rows.find(r => r.dimensionId === 'entity_count');
  const practiceRow = matrix.rows.find(r => r.dimensionId === 'practice_count');

  assert(entityRow, 'Entity count row should exist');
  assert(practiceRow, 'Practice count row should exist');

  assert(
    entityRow.cells[0].value === 1,
    'Auto-derived entity count should be 1 for sample-data'
  );
  assert(
    practiceRow.cells[0].value === 1,
    'Auto-derived practice count should be 1 for sample-data'
  );

  // Now override the entity count in the binding and ensure override wins
  const overridden = ComparisonServices.setBindingValue(
    binding,
    'entity_count',
    'rel-test',
    99
  );
  const matrixOverride = ComparisonServices.buildComparisonMatrix(
    baseData,
    schema,
    overridden
  );
  const entityRowOverride = matrixOverride.rows.find(
    r => r.dimensionId === 'entity_count'
  );

  assert(
    entityRowOverride.cells[0].value === 99,
    'Explicit binding value should override auto-derived count'
  );
}

function testApplyTemplateToReligion() {
  const template = {
    id: 'tmpl-entities-skeleton',
    name: 'Entity Skeleton Template',
    description: 'Copies entities from a source religion but clears summaries and sources.',
    tags: [],
    sourceReligionId: 'rel-test',
    rules: [
      {
        id: 'rule-entities',
        collection: 'entities',
        matchTags: [], // copy all entities from the source religion
        copyMode: 'copy_structure_only',
        fieldsToClear: ['summary', 'notes', 'sourcesOfTruth', 'sourceEntityIds']
      }
    ]
  };

  const newData = ComparisonServices.applyTemplateToReligion(baseData, template, {
    newReligionId: 'rel-template',
    newReligionName: 'Test Faith Template',
    newReligionShortName: 'TFT',
    newReligionSummary: 'Template of Test Faith.',
    extraReligionTags: ['template']
  });

  // Original data should be unchanged
  assert(
    baseData.religions.length === 1,
    'Base data should still have 1 religion'
  );

  assert(
    newData.religions.length === 2,
    'New data should have one extra religion'
  );

  const newRel = newData.religions.find(r => r.id === 'rel-template');
  assert(newRel, 'New religion with id rel-template should exist');
  assert(
    newRel.summary === 'Template of Test Faith.',
    'New religion should use provided summary'
  );
  assert(
    newRel.tags.includes('template'),
    'New religion should include extra template tag'
  );

  // Entities: base has 1, new data should have base + copied skeleton(s)
  assert(
    newData.entities.length === baseData.entities.length + 1,
    'One skeleton entity should be added for the new religion'
  );

  const skeleton = newData.entities.find(e => e.religionId === 'rel-template');
  assert(skeleton, 'Skeleton entity should belong to new religion');
  assert(
    skeleton.id !== baseData.entities[0].id,
    'Skeleton entity should have a new id'
  );

  // Summary and sources should be cleared for skeleton
  assert(
    !skeleton.summary,
    'Skeleton entity summary should be cleared (empty string or null)'
  );
  assert(
    Array.isArray(skeleton.sourcesOfTruth) ? skeleton.sourcesOfTruth.length === 0 : !skeleton.sourcesOfTruth,
    'Skeleton entity sourcesOfTruth should be cleared'
  );
  assert(
    Array.isArray(skeleton.sourceEntityIds) ? skeleton.sourceEntityIds.length === 0 : !skeleton.sourceEntityIds,
    'Skeleton entity sourceEntityIds should be cleared'
  );
}

function runTests() {
  console.log('Running comparison-services tests...');
  testCreateBlankBinding();
  testSetBindingValueIsPure();
  testBuildComparisonMatrixAutoCounts();
  testApplyTemplateToReligion();
  console.log('All comparison-services tests passed ✅');
}

runTests();
