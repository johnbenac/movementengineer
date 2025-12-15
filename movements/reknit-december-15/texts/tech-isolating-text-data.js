(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    texts: [
      {
        id: 'txt-reknit-tech-isolation-source',
        movementId: 'mov-reknit-december-15',
        parentId: null,
        level: 'work',
        title: 'Notes on Digital Isolation',
        label: 'Digital Isolation',
        content:
          'Screens promise connection but often replace shared time with endless scrolling, leaving neighbors unseen and unheard.',
        mainFunction: 'commentary',
        tags: ['diagnosis', 'technology'],
        mentionsEntityIds: ['ent-digital-silos', 'ent-corporate-platforms']
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
