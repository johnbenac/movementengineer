(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    claims: [
      {
        id: 'clm-reknit-in-person-weave',
        movementId: 'mov-reknit-december-15',
        text: 'In-person meetings can link us together.',
        category: 'practice',
        tags: ['community', 'gathering'],
        sourceTextIds: ['txt-reknit-manifesto-weaving', 'txt-reknit-in-person-link-source'],
        aboutEntityIds: ['ent-local-circles', 'ent-shared-humanity'],
        sourcesOfTruth: ['circle pilot reports'],
        sourceEntityIds: [],
        notes: 'Frames gatherings as the main loom for the movement.'
      }
    ]
  };

  if (typeof module !== 'undefined') {
    module.exports = dataset;
  }
  if (typeof window !== 'undefined') {
    window.movementDatasets = window.movementDatasets || [];
    window.movementDatasets.push(dataset);
  }
})();
