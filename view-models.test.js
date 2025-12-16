const ViewModels = require('./view-models');
const data = require('./movement-data');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testMovementDashboard() {
  const vm = ViewModels.buildMovementDashboardViewModel(data, {
    movementId: 'mov-catholic'
  });

  assert(vm.movement.id === 'mov-catholic', 'Dashboard should pick the right movement');
  assert(vm.entityStats.totalEntities === 23, 'Should count 23 entities');
  assert(vm.practiceStats.totalPractices === 7, 'Should count 7 practices');
  assert(vm.eventStats.totalEvents === 8, 'Should count 8 events');
}

function testEntityDetail() {
  const vm = ViewModels.buildEntityDetailViewModel(data, {
    entityId: 'ent-god-trinity'
  });

  assert(vm.entity.id === 'ent-god-trinity', 'Entity detail should be for ent-god-trinity');
  assert(Array.isArray(vm.practices), 'Entity detail should include practices array');
  assert(vm.practices.length === 2, 'The Holy Trinity should be involved in 2 practices');
  assert(
    vm.practices.some(p => p.id === 'pr-sunday-mass'),
    'Practices should include Sunday Mass'
  );
}

function testPracticeDetail() {
  const vm = ViewModels.buildPracticeDetailViewModel(data, {
    practiceId: 'pr-sunday-mass'
  });

  assert(vm.practice.id === 'pr-sunday-mass', 'Practice detail should be for pr-sunday-mass');
  assert(vm.entities.length === 5, 'Practice should involve 5 entities');
  assert(
    vm.entities.some(e => e.id === 'ent-god-trinity'),
    'Involved entities should include The Holy Trinity'
  );
}

function testGraphFilters() {
  const baseGraph = {
    nodes: [
      { id: 'a', type: 'Entity', name: 'Entity A' },
      { id: 'b', type: 'Claim', name: 'Claim B' },
      { id: 'c', type: 'Rule', name: 'Rule C' }
    ],
    edges: [
      { fromId: 'a', toId: 'b', relationType: 'rel_ab' },
      { fromId: 'b', toId: 'c', relationType: 'rel_bc' }
    ]
  };

  const typeFiltered = ViewModels.filterGraphModel(baseGraph, { nodeTypeFilter: ['Claim'] });
  assert(typeFiltered.nodes.length === 1 && typeFiltered.nodes[0].id === 'b', 'Type filter should keep matching nodes');
  assert(typeFiltered.edges.length === 0, 'Edges should be dropped if endpoints are filtered out');

  const depthFiltered = ViewModels.filterGraphModel(baseGraph, { centerNodeId: 'a', depth: 1 });
  assert(depthFiltered.nodes.length === 2, 'Depth filter should include center + 1-hop neighbours');
  assert(depthFiltered.edges.length === 1, 'Depth filter should keep edges within the hop window');

  const centerPreserved = ViewModels.filterGraphModel(baseGraph, {
    centerNodeId: 'a',
    depth: 1,
    nodeTypeFilter: ['Claim']
  });
  assert(centerPreserved.nodes.some(n => n.id === 'a'), 'Center node should be preserved even if type filtered out');
}

function runTests() {
  console.log('Running view-model tests...');
  testMovementDashboard();
  testEntityDetail();
  testPracticeDetail();
  testGraphFilters();
  console.log('All tests passed ✅');
}

runTests();
