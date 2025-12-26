const path = require('path');
const { loadMovementDataset } = require('../../src/core/markdownDatasetLoader');
const NodeIndex = require('../../src/core/nodeIndex');
const GraphIndex = require('../../src/core/graphIndex');
const { getModel } = require('../../src/core/modelRegistry');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('Running graph index tests...');
  const { data, specVersion } = await loadMovementDataset({
    source: 'local',
    repoPath: path.join(__dirname, '..', '..', 'test-fixtures/markdown-repo')
  });

  const model = getModel(specVersion);
  const nodeIndex = NodeIndex.buildNodeIndex(data, model);
  const graphIndex = GraphIndex.buildGraphIndex(data, model, nodeIndex);

  const locationNode = nodeIndex.get('loc-park');
  assert(locationNode, 'NodeIndex should resolve loc-park');
  assert(locationNode.collectionName === 'locations', 'loc-park should be in locations');

  const noteEdges = graphIndex.outEdgesById.get('not-park') || [];
  assert(
    noteEdges.some(edge => edge.toId === 'loc-park' && edge.fieldPath === 'targetId'),
    'GraphIndex should include note -> location edge'
  );

  const inbound = graphIndex.inEdgesById.get('loc-park') || [];
  assert(
    inbound.some(edge => edge.fromId === 'not-park' && edge.fieldPath === 'targetId'),
    'GraphIndex should include location backlinks'
  );

  console.log('Graph index tests passed ✅');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
