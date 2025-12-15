(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    entities: [
      {
        id: 'ent-reknit-weave',
        movementId: 'mov-reknit-december-15',
        name: 'Reknit Weave',
        kind: 'idea',
        summary: 'The shared effort to repair social bonds through local, intentional gatherings.',
        notes: null,
        tags: ['community', 'vision'],
        sourcesOfTruth: ['Reknit Manifesto'],
        sourceEntityIds: []
      },
      {
        id: 'ent-digital-silos',
        movementId: 'mov-reknit-december-15',
        name: 'Digital Silos',
        kind: 'idea',
        summary: 'Fragmented attention pools created by algorithmic feeds that isolate people from nearby relationships.',
        notes: null,
        tags: ['technology', 'isolation'],
        sourcesOfTruth: ['Notes on Digital Isolation'],
        sourceEntityIds: []
      },
      {
        id: 'ent-local-circles',
        movementId: 'mov-reknit-december-15',
        name: 'Local Circles',
        kind: 'idea',
        summary: 'Small, recurring, in-person gatherings that anchor belonging and mutual aid.',
        notes: 'Living rooms, porches, and public spaces are treated as looms for community.',
        tags: ['community', 'gathering'],
        sourcesOfTruth: ['Gathering as Loom'],
        sourceEntityIds: []
      },
      {
        id: 'ent-corporate-platforms',
        movementId: 'mov-reknit-december-15',
        name: 'Corporate Platforms',
        kind: 'idea',
        summary: 'Profit-driven tech systems that capture attention and personal data as raw materials.',
        notes: null,
        tags: ['technology', 'economy'],
        sourcesOfTruth: ['Against Becoming the Product'],
        sourceEntityIds: []
      },
      {
        id: 'ent-shared-humanity',
        movementId: 'mov-reknit-december-15',
        name: 'Shared Humanity',
        kind: 'idea',
        summary: 'The inherent worth of people beyond metrics, optimized feeds, or productivity demands.',
        notes: null,
        tags: ['dignity', 'wellbeing'],
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
