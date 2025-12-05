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

function runTests() {
  console.log('Running view-model tests...');
  testMovementDashboard();
  testEntityDetail();
  testPracticeDetail();
  console.log('All tests passed ✅');
}

runTests();
