const path = require('path');
const ComparisonServices = require('./comparison-services');
const { loadMovementDataset } = require('./markdown-dataset-loader');

async function loadFixtureData() {
  const { data } = await loadMovementDataset({
    source: 'local',
    repoPath: path.join(__dirname, 'test-fixtures/markdown-repo')
  });
  return data;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testCreateBlankBinding(baseData) {
  const schema = {
    id: 'schema-basic',
    name: 'Basic Counts',
    description: 'Counts of core collections.',
    tags: [],
    dimensions: [
      {
        id: 'entity_count',
        label: 'Entities',
        description: 'Number of entities for this movement.',
        valueKind: 'number',
        sourceKind: 'collection_count',
        sourceCollection: 'entities',
        sourceFilterTags: []
      },
      {
        id: 'practice_count',
        label: 'Practices',
        description: 'Number of practices for this movement.',
        valueKind: 'number',
        sourceKind: 'collection_count',
        sourceCollection: 'practices',
        sourceFilterTags: []
      }
    ]
  };

  const binding = ComparisonServices.createBlankBinding(schema, ['mov-fixture']);

  assert(binding.schemaId === 'schema-basic', 'Binding should reference schema id');
  assert(binding.movementIds.length === 1, 'Binding should include one movement');
  assert(
    binding.movementIds[0] === 'mov-fixture',
    'Binding movement should be mov-fixture'
  );
  assert(Array.isArray(binding.cells), 'Binding.cells should be an array');
  assert(
    binding.cells.length === 2,
    'There should be one cell per dimension for mov-fixture'
  );

  binding.cells.forEach(cell => {
    assert(cell.value === null, 'New binding cells should start with null value');
  });
}

function testSetBindingValueIsPure(baseData) {
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
        sourceFilterTags: []
      }
    ]
  };

  const binding = ComparisonServices.createBlankBinding(schema, ['mov-fixture']);
  const originalCell = binding.cells[0];

  const updated = ComparisonServices.setBindingValue(
    binding,
    'entity_count',
    'mov-fixture',
    42,
    'Manual override'
  );

  const updatedCell = updated.cells.find(
    c => c.dimensionId === 'entity_count' && c.movementId === 'mov-fixture'
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

function testBuildComparisonMatrixAutoCounts(baseData) {
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
        sourceFilterTags: []
      },
      {
        id: 'practice_count',
        label: 'Practices',
        valueKind: 'number',
        sourceKind: 'collection_count',
        sourceCollection: 'practices',
        sourceFilterTags: []
      }
    ]
  };

  const binding = ComparisonServices.createBlankBinding(schema, ['mov-fixture']);
  const matrix = ComparisonServices.buildComparisonMatrix(baseData, schema, binding);

  assert(matrix.schemaId === 'schema-basic', 'Matrix should reference schema id');
  assert(matrix.movements.length === 1, 'There should be one movement in the matrix');
  assert(matrix.movements[0].id === 'mov-fixture', 'Movement id should be mov-fixture');
  assert(matrix.rows.length === 2, 'There should be a row per dimension');

  const entityRow = matrix.rows.find(r => r.dimensionId === 'entity_count');
  const practiceRow = matrix.rows.find(r => r.dimensionId === 'practice_count');

  assert(entityRow, 'Entity count row should exist');
  assert(practiceRow, 'Practice count row should exist');

  assert(
    entityRow.cells[0].value === 2,
    'Auto-derived entity count should be 2 for fixture dataset'
  );
  assert(
    practiceRow.cells[0].value === 1,
    'Auto-derived practice count should be 1 for fixture dataset'
  );

  const overridden = ComparisonServices.setBindingValue(
    binding,
    'entity_count',
    'mov-fixture',
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

function testApplyTemplateToMovement(baseData) {
  const template = {
    id: 'tmpl-entities-skeleton',
    name: 'Entity Skeleton Template',
    description: 'Copies entities from a source movement but clears summaries and sources.',
    tags: [],
    sourceMovementId: 'mov-fixture',
    rules: [
      {
        id: 'rule-entities',
        collection: 'entities',
        matchTags: [], // copy all entities from the source movement
        copyMode: 'copy_structure_only',
        fieldsToClear: ['summary', 'notes', 'sourcesOfTruth', 'sourceEntityIds']
      }
    ]
  };

  const newData = ComparisonServices.applyTemplateToMovement(baseData, template, {
    newMovementId: 'mov-template',
    newMovementName: 'Test Faith Template',
    newMovementShortName: 'TFT',
    newMovementSummary: 'Template of Test Faith.',
    extraMovementTags: ['template']
  });

  const originalMovementCount = baseData.movements.length;
  const sourceEntityCount = baseData.entities.filter(
    e => e.movementId === 'mov-fixture'
  ).length;

  assert(
    baseData.movements.length === originalMovementCount,
    'Base data should remain unchanged after templating'
  );

  assert(
    newData.movements.length === originalMovementCount + 1,
    'New data should include one extra movement'
  );

  const newMovement = newData.movements.find(r => r.id === 'mov-template');
  assert(newMovement, 'New movement with id mov-template should exist');
  assert(
    newMovement.summary === 'Template of Test Faith.',
    'New movement should use provided summary'
  );
  assert(
    newMovement.tags.includes('template'),
    'New movement should include extra template tag'
  );

  assert(
    newData.entities.length === baseData.entities.length + sourceEntityCount,
    'Skeleton entities should be added for the new movement based on the source movement'
  );

  const skeleton = newData.entities.find(e => e.movementId === 'mov-template');
  assert(skeleton, 'Skeleton entity should belong to new movement');
  assert(
    newData.entities.filter(e => e.movementId === 'mov-template').length ===
      sourceEntityCount,
    'All source movement entities should be represented in the template movement'
  );
  assert(
    skeleton.id !== baseData.entities[0].id,
    'Skeleton entity should have a new id'
  );

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

async function runTests() {
  console.log('Running comparison-services tests...');
  const baseData = await loadFixtureData();
  testCreateBlankBinding(baseData);
  testSetBindingValueIsPure(baseData);
  testBuildComparisonMatrixAutoCounts(baseData);
  testApplyTemplateToMovement(baseData);
  console.log('All comparison-services tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
