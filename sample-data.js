const data = {
  religions: [
    {
      id: 'rel-test',
      name: 'Test Faith',
      shortName: 'TF',
      summary: 'A tiny test religion.',
      notes: null,
      tags: ['test']
    }
  ],
  textCollections: [],
  texts: [],
  entities: [
    {
      id: 'ent-god',
      religionId: 'rel-test',
      name: 'Test God',
      kind: 'being',
      summary: 'The primary deity of Test Faith.',
      notes: null,
      tags: ['deity'],
      sourcesOfTruth: ['tradition'],
      sourceEntityIds: []
    }
  ],
  practices: [
    {
      id: 'pr-weekly',
      religionId: 'rel-test',
      name: 'Weekly Gathering',
      kind: 'ritual',
      description: 'People meet once a week.',
      frequency: 'weekly',
      isPublic: true,
      notes: null,
      tags: ['weekly', 'gathering'],
      involvedEntityIds: ['ent-god'],
      instructionsTextIds: [],
      supportingClaimIds: [],
      sourcesOfTruth: ['tradition'],
      sourceEntityIds: []
    }
  ],
  events: [],
  rules: [],
  claims: [],
  media: [],
  notes: [],
  relations: []
};

if (typeof module !== 'undefined') {
  module.exports = data;
}
