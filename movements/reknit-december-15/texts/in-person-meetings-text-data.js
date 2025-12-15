(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    texts: [
      {
        id: 'txt-reknit-in-person-link-source',
        movementId: 'mov-reknit-december-15',
        parentId: null,
        level: 'work',
        title: 'Gathering as Loom',
        label: 'Gathering as Loom',
        content:
          'Face-to-face circles let people read tone, pause, and breath together, giving each person back their full dignity.',
        mainFunction: 'teaching',
        tags: ['community', 'practice'],
        mentionsEntityIds: ['ent-local-circles', 'ent-shared-humanity']
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
