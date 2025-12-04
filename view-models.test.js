const ViewModels = require('./view-models');
const data = require('./sample-data');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testReligionDashboard() {
  const vm = ViewModels.buildReligionDashboardViewModel(data, {
    religionId: 'rel-test'
  });

  assert(vm.religion.id === 'rel-test', 'Dashboard should pick the right religion');
  assert(vm.entityStats.totalEntities === 1, 'Should count 1 entity');
  assert(vm.practiceStats.totalPractices === 1, 'Should count 1 practice');
  assert(vm.eventStats.totalEvents === 0, 'Should count 0 events');
}

function testEntityDetail() {
  const vm = ViewModels.buildEntityDetailViewModel(data, {
    entityId: 'ent-god'
  });

  assert(vm.entity.id === 'ent-god', 'Entity detail should be for ent-god');
  assert(Array.isArray(vm.practices), 'Entity detail should include practices array');
  assert(vm.practices.length === 1, 'Test God should be involved in 1 practice');
  assert(vm.practices[0].id === 'pr-weekly', 'Practice should be Weekly Gathering');
}

function testPracticeDetail() {
  const vm = ViewModels.buildPracticeDetailViewModel(data, {
    practiceId: 'pr-weekly'
  });

  assert(vm.practice.id === 'pr-weekly', 'Practice detail should be for pr-weekly');
  assert(vm.entities.length === 1, 'Practice should involve 1 entity');
  assert(vm.entities[0].id === 'ent-god', 'Involved entity should be Test God');
}

function runTests() {
  console.log('Running view-model tests...');
  testReligionDashboard();
  testEntityDetail();
  testPracticeDetail();
  console.log('All tests passed ✅');
}

runTests();
