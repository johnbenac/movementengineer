(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    claims: [
      {
        id: 'clm-reknit-corporate-productization',
        movementId: 'mov-reknit-december-15',
        text: 'Corporations and other organizations use technology to make us products, to the detriment of our mental health.',
        category: 'critique',
        tags: ['mental_health', 'technology', 'economy'],
        sourceTextIds: ['txt-reknit-manifesto-resist-extraction', 'txt-reknit-corporate-product-source'],
        aboutEntityIds: ['ent-corporate-platforms', 'ent-digital-silos', 'ent-shared-humanity'],
        sourcesOfTruth: ['platform business model research'],
        sourceEntityIds: [],
        notes: 'Motivates reclaiming tech for people-first gatherings.'
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
