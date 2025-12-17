(function registerMovementDataset() {
  const dataset = {
    version: '3.5',
    claims: [
      {
        id: 'clm-race-raises-awareness',
        movementId: 'mov-race-for-the-cure',
        text:
          'Neighborhood 5K routes put breast cancer screening reminders in front of residents who rarely see outreach.',
        category: 'awareness',
        tags: ['community', 'health'],
        sourceTextIds: ['txt-race-day-handbook'],
        aboutEntityIds: ['ent-susan-g-komen', 'ent-race-volunteers'],
        sourcesOfTruth: ['participant surveys'],
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
