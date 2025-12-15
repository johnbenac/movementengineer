(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    relations: [
      {
        id: 'rel-reknit-platforms-produce-silos',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-corporate-platforms',
        toEntityId: 'ent-digital-silos',
        relationType: 'produces',
        tags: ['technology', 'attention'],
        supportingClaimIds: ['clm-reknit-corporate-productization'],
        sourcesOfTruth: ['Against Becoming the Product'],
        sourceEntityIds: []
      },
      {
        id: 'rel-reknit-circles-renew-humanity',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-local-circles',
        toEntityId: 'ent-shared-humanity',
        relationType: 'strengthens',
        tags: ['community', 'wellbeing'],
        supportingClaimIds: ['clm-reknit-in-person-weave'],
        sourcesOfTruth: ['Gathering as Loom'],
        sourceEntityIds: []
      },
      {
        id: 'rel-reknit-weave-organizes-circles',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-reknit-weave',
        toEntityId: 'ent-local-circles',
        relationType: 'organizes_through',
        tags: ['movement', 'practice'],
        supportingClaimIds: ['clm-reknit-in-person-weave'],
        sourcesOfTruth: ['Reknit Manifesto'],
        sourceEntityIds: []
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
