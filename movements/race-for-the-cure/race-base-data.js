(function registerMovementDataset() {
  const dataset = {
    version: '3.4',
    movements: [
      {
        id: 'mov-race-for-the-cure',
        name: 'Race for the Cure',
        shortName: 'Race for the Cure',
        summary:
          'Annual 5K runs and walks that mobilize communities to fund breast cancer research and honor survivors.',
        notes: null,
        tags: ['breast_cancer', 'fundraising', 'community']
      }
    ],
    textCollections: [
      {
        id: 'tc-race-guide',
        movementId: 'mov-race-for-the-cure',
        name: 'Race Day Materials',
        description: 'Orientation handouts and safety sheets distributed before the event.',
        tags: ['guide'],
        rootTextIds: ['txt-race-day-handbook']
      }
    ],
    texts: [
      {
        id: 'txt-race-day-handbook',
        movementId: 'mov-race-for-the-cure',
        parentId: null,
        level: 'work',
        title: 'Race Day Handbook',
        label: 'Race Day Handbook',
        content:
          'Concise instructions for start corrals, course etiquette, hydration, and cheering sections used by local chapters.',
        mainFunction: 'instruction',
        tags: ['logistics', 'volunteer'],
        mentionsEntityIds: ['ent-route-safety-team', 'ent-race-volunteers']
      },
      {
        id: 'txt-survivor-opening',
        movementId: 'mov-race-for-the-cure',
        parentId: null,
        level: 'section',
        title: 'Opening Circle for Survivors',
        label: 'Survivor Opening',
        content:
          'An opening circle before the race where survivors and families share why they walk and how donations translate into grants.',
        mainFunction: 'testimony',
        tags: ['survivors', 'fundraising'],
        mentionsEntityIds: ['ent-survivor-teams', 'ent-susan-g-komen']
      }
    ],
    entities: [
      {
        id: 'ent-susan-g-komen',
        movementId: 'mov-race-for-the-cure',
        name: 'Susan G. Komen Foundation',
        kind: 'organization',
        summary: 'Nonprofit stewarding Race for the Cure events and research grants.',
        notes: null,
        tags: ['nonprofit', 'health'],
        sourcesOfTruth: ['foundation charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-survivor-teams',
        movementId: 'mov-race-for-the-cure',
        name: 'Survivor and Family Teams',
        kind: 'community',
        summary: 'Teams formed by survivors, families, and coworkers to fundraise together.',
        notes: null,
        tags: ['community', 'solidarity'],
        sourcesOfTruth: ['team captain guides'],
        sourceEntityIds: []
      },
      {
        id: 'ent-race-volunteers',
        movementId: 'mov-race-for-the-cure',
        name: 'Race Volunteers',
        kind: 'community',
        summary: 'Route marshals, registration crews, and finish-line support recruited locally.',
        notes: null,
        tags: ['volunteer', 'logistics'],
        sourcesOfTruth: ['local chapter SOPs'],
        sourceEntityIds: []
      },
      {
        id: 'ent-route-safety-team',
        movementId: 'mov-race-for-the-cure',
        name: 'Route Safety Team',
        kind: 'organization',
        summary: 'Medical volunteers and course monitors stationed along the 5K route.',
        notes: null,
        tags: ['safety', 'volunteer'],
        sourcesOfTruth: ['route marshal checklists'],
        sourceEntityIds: []
      }
    ],
    practices: [],
    events: [],
    rules: [],
    claims: [],
    media: [],
    notes: [],
    relations: []
  };

  if (typeof module !== 'undefined') {
    module.exports = dataset;
  }
  if (typeof window !== 'undefined') {
    window.movementDatasets = window.movementDatasets || [];
    window.movementDatasets.push(dataset);
  }
})();
