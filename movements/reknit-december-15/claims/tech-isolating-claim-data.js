(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    claims: [
      {
        id: 'clm-reknit-tech-isolating',
        movementId: 'mov-reknit-december-15',
        text: 'Technology is isolating us.',
        category: 'diagnosis',
        tags: ['technology', 'isolation'],
        sourceTextIds: ['txt-reknit-manifesto-unraveling', 'txt-reknit-tech-isolation-source'],
        aboutEntityIds: ['ent-digital-silos', 'ent-corporate-platforms'],
        sourcesOfTruth: ['community observation'],
        sourceEntityIds: [],
        notes: 'Anchors the need for local reconnection.'
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
