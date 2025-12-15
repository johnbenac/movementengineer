(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    movements: [
      {
        id: 'mov-reknit-december-15',
        name: 'Reknit December 15',
        shortName: 'Reknit 12/15',
        summary:
          'A call to weave people back together through intentional, local gatherings that resist isolating technologies.',
        notes: 'Founded on a December 15 manifesto that frames digital tools as materials to be reclaimed for community.',
        tags: ['community', 'technology', 'togetherness']
      }
    ],
    textCollections: [
      {
        id: 'tc-reknit-core',
        movementId: 'mov-reknit-december-15',
        name: 'Reknit Core Texts',
        description: 'Manifesto and supporting passages that describe why and how to reconnect people.',
        tags: ['manifesto', 'guidance'],
        rootTextIds: [
          'txt-reknit-manifesto',
          'txt-reknit-tech-isolation-source',
          'txt-reknit-in-person-link-source',
          'txt-reknit-corporate-product-source'
        ]
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
