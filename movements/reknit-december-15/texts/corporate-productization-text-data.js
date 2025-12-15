(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    texts: [
      {
        id: 'txt-reknit-corporate-product-source',
        movementId: 'mov-reknit-december-15',
        parentId: null,
        level: 'work',
        title: 'Against Becoming the Product',
        label: 'Against Becoming the Product',
        content:
          'Platforms engineer nudges that convert friendship into data points. This commodification erodes mental health and agency.',
        mainFunction: 'commentary',
        tags: ['critique', 'mental_health'],
        mentionsEntityIds: ['ent-corporate-platforms', 'ent-digital-silos', 'ent-shared-humanity']
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
