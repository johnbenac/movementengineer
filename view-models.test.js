const path = require('path');
const ViewModels = require('./view-models');
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

function testMovementDashboard(data) {
  const vm = ViewModels.buildMovementDashboardViewModel(data, {
    movementId: 'mov-fixture'
  });

  assert(vm.movement.id === 'mov-fixture', 'Dashboard should pick the right movement');
  assert(vm.entityStats.totalEntities === 2, 'Should count 2 entities');
  assert(vm.practiceStats.totalPractices === 1, 'Should count 1 practice');
  assert(vm.eventStats.totalEvents === 1, 'Should count 1 event');
}

function testEntityDetail(data) {
  const vm = ViewModels.buildEntityDetailViewModel(data, {
    entityId: 'ent-guide'
  });

  assert(vm.entity.id === 'ent-guide', 'Entity detail should be for ent-guide');
  assert(Array.isArray(vm.practices), 'Entity detail should include practices array');
  assert(vm.practices.length === 1, 'Guide should be involved in 1 practice');
  assert(vm.practices.some(p => p.id === 'prc-reflection'), 'Practices should include reflection');
}

function testPracticeDetail(data) {
  const vm = ViewModels.buildPracticeDetailViewModel(data, {
    practiceId: 'prc-reflection'
  });

  assert(vm.practice.id === 'prc-reflection', 'Practice detail should be for prc-reflection');
  assert(vm.entities.length === 1, 'Practice should involve 1 entity');
  assert(vm.entities.some(e => e.id === 'ent-guide'), 'Involved entities should include the guide');
}

function testGraphFiltering() {
  const base = {
    nodes: [
      { id: 't1', type: 'TextNode', name: 'Text 1' },
      { id: 'c1', type: 'Claim', name: 'Claim 1' },
      { id: 'e1', type: 'Entity', name: 'Entity 1' }
    ],
    edges: [
      { id: 'a', fromId: 't1', toId: 'c1', relationType: 'supports_claim' },
      { id: 'b', fromId: 'c1', toId: 'e1', relationType: 'about' }
    ]
  };

  const onlyClaims = ViewModels.filterGraphModel(base, { nodeTypeFilter: ['Claim'] });
  assert(onlyClaims.nodes.length === 1, 'Type-only filter keeps only Claim nodes');
  assert(onlyClaims.nodes[0].id === 'c1', 'Claim node is retained');
  assert(onlyClaims.edges.length === 0, 'Edges drop when endpoints missing');

  const hop1 = ViewModels.filterGraphModel(base, { centerNodeId: 't1', depth: 1 });
  assert(hop1.nodes.some(n => n.id === 't1'), 'Hop filter keeps center');
  assert(hop1.nodes.some(n => n.id === 'c1'), 'Hop filter keeps 1-hop neighbor');
  assert(!hop1.nodes.some(n => n.id === 'e1'), '2-hop node excluded at depth 1');

  const combined = ViewModels.filterGraphModel(base, {
    centerNodeId: 't1',
    depth: 2,
    nodeTypeFilter: ['Claim']
  });
  assert(
    combined.nodes.some(n => n.id === 't1'),
    'Center preserved even if type-filtered out'
  );
  assert(combined.nodes.some(n => n.id === 'c1'), 'Allowed type node kept');
  assert(!combined.nodes.some(n => n.id === 'e1'), 'Excluded types are filtered out');
}

async function runTests() {
  console.log('Running view-model tests...');
  const data = await loadFixtureData();
  testMovementDashboard(data);
  testEntityDetail(data);
  testPracticeDetail(data);
  testGraphFiltering();
  console.log('All tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
