(function registerMovementDataset() {
  const dataset = {
    version: '3.6',
    rules: [
      {
        id: 'rl-race-course-safety',
        movementId: 'mov-race-for-the-cure',
        description: 'Keep hydration tables and medical tents visible at every kilometer marker.',
        kind: 'should_do',
        tags: ['safety', 'logistics'],
        supportingTextIds: ['txt-race-day-handbook'],
        supportingClaimIds: ['clm-race-raises-awareness'],
        relatedPracticeIds: [],
        sourcesOfTruth: ['route marshal checklists'],
        sourceEntityIds: ['ent-route-safety-team'],
        notes: null
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
