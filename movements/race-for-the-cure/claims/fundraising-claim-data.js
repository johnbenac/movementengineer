(function registerMovementDataset() {
  const dataset = {
    version: '3.6',
    claims: [
      {
        id: 'clm-race-funds-research',
        movementId: 'mov-race-for-the-cure',
        text: 'Small-dollar pledges from team fundraising cumulatively seed local screening and research grants.',
        category: 'fundraising',
        tags: ['grants', 'community'],
        sourceTextIds: ['txt-survivor-opening'],
        aboutEntityIds: ['ent-survivor-teams', 'ent-susan-g-komen'],
        sourcesOfTruth: ['local grant reports'],
        sourceEntityIds: [],
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
