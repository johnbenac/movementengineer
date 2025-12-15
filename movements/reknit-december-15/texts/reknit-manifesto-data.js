(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    texts: [
      {
        id: 'txt-reknit-manifesto',
        movementId: 'mov-reknit-december-15',
        parentId: null,
        level: 'work',
        title: 'Reknit Manifesto',
        label: 'Reknit Manifesto',
        content:
          'A declaration that we must gather, stitch, and repair the social fabric frayed by isolating technologies.',
        mainFunction: 'commentary',
        tags: ['manifesto', 'orientation'],
        mentionsEntityIds: [
          'ent-reknit-weave',
          'ent-digital-silos',
          'ent-local-circles',
          'ent-corporate-platforms',
          'ent-shared-humanity'
        ]
      },
      {
        id: 'txt-reknit-manifesto-unraveling',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-manifesto',
        level: 'section',
        title: 'We name the unraveling',
        label: 'Unraveling',
        content:
          'We see neighbors scroll past one another, their days mediated by feeds that prize capture over care. This is digital isolation.',
        mainFunction: 'commentary',
        tags: ['diagnosis'],
        mentionsEntityIds: ['ent-digital-silos', 'ent-corporate-platforms']
      },
      {
        id: 'txt-reknit-manifesto-weaving',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-manifesto',
        level: 'section',
        title: 'We pick up the needles together',
        label: 'Weaving',
        content:
          'We choose living rooms, libraries, and porches as our looms. In-person circles let us feel one another again.',
        mainFunction: 'commentary',
        tags: ['practice', 'community'],
        mentionsEntityIds: ['ent-local-circles', 'ent-shared-humanity']
      },
      {
        id: 'txt-reknit-manifesto-resist-extraction',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-manifesto',
        level: 'section',
        title: 'We resist extraction',
        label: 'Resist Extraction',
        content:
          'Corporate platforms treat our attention as raw material. We reclaim tools and time so people are valued beyond metrics.',
        mainFunction: 'commentary',
        tags: ['resistance', 'wellbeing'],
        mentionsEntityIds: ['ent-corporate-platforms', 'ent-reknit-weave', 'ent-shared-humanity']
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
