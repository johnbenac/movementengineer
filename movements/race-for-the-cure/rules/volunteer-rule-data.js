(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    rules: [
      {
        id: 'rl-volunteer-checkin',
        movementId: 'mov-race-for-the-cure',
        description: 'Volunteer captains must verify every marshal is placed before the first corral starts.',
        kind: 'must_do',
        tags: ['volunteer', 'safety'],
        supportingTextIds: ['txt-race-day-handbook'],
        supportingClaimIds: ['clm-race-funds-research', 'clm-race-raises-awareness'],
        relatedPracticeIds: [],
        sourcesOfTruth: ['local chapter SOPs'],
        sourceEntityIds: ['ent-race-volunteers'],
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
