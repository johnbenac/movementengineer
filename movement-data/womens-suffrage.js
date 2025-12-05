const data = {
  version: '3.4',
  movements: [
    {
      id: 'mov-womens-suffrage',
      name: "Women's Suffrage Movement",
      shortName: 'Suffrage',
      summary:
        'A political and social movement advocating for women’s right to vote and full participation in civic life, culminating in the Nineteenth Amendment in the United States.',
      notes: null,
      tags: ['civic', 'political', 'rights']
    }
  ],
  textCollections: [
    {
      id: 'tc-suffrage-foundations',
      movementId: 'mov-womens-suffrage',
      name: 'Foundational Texts',
      description: 'Key declarations, speeches, and amendments that shaped the push for the vote.',
      tags: ['primary_sources'],
      rootTextIds: ['txt-seneca-falls']
    }
  ],
  texts: [
    {
      id: 'txt-seneca-falls',
      movementId: 'mov-womens-suffrage',
      parentId: null,
      level: 'work',
      title: 'Declaration of Sentiments (summary)',
      label: 'Seneca Falls Declaration',
      content:
        'Modeled on the Declaration of Independence, it asserted the equal rights of women and listed grievances against male domination.',
      mainFunction: 'teaching',
      tags: ['declaration', 'rights'],
      mentionsEntityIds: ['ent-elizabeth-stanton', 'ent-womens-rights']
    },
    {
      id: 'txt-nineteenth-amendment',
      movementId: 'mov-womens-suffrage',
      parentId: null,
      level: 'work',
      title: 'Nineteenth Amendment (summary)',
      label: '19th Amendment',
      content:
        'The U.S. constitutional amendment ratified in 1920 stating that the right to vote cannot be denied on the basis of sex.',
      mainFunction: 'rule',
      tags: ['amendment', 'law'],
      mentionsEntityIds: ['ent-nineteenth-amendment', 'ent-womens-rights']
    }
  ],
  entities: [
    {
      id: 'ent-womens-rights',
      movementId: 'mov-womens-suffrage',
      name: "Women's civil rights",
      kind: 'idea',
      summary: 'The belief that women deserve equal legal and political rights, including the franchise.',
      notes: null,
      tags: ['rights', 'equality'],
      sourcesOfTruth: ['Declaration of Sentiments'],
      sourceEntityIds: []
    },
    {
      id: 'ent-elizabeth-stanton',
      movementId: 'mov-womens-suffrage',
      name: 'Elizabeth Cady Stanton',
      kind: 'person',
      summary: 'Organizer of the Seneca Falls Convention and co-author of the Declaration of Sentiments.',
      notes: null,
      tags: ['leader', 'organizer'],
      sourcesOfTruth: ['historical accounts'],
      sourceEntityIds: []
    },
    {
      id: 'ent-susan-anthony',
      movementId: 'mov-womens-suffrage',
      name: 'Susan B. Anthony',
      kind: 'person',
      summary: 'Prominent activist who campaigned nationally for women’s voting rights.',
      notes: null,
      tags: ['leader', 'organizer'],
      sourcesOfTruth: ['historical accounts'],
      sourceEntityIds: []
    },
    {
      id: 'ent-nineteenth-amendment',
      movementId: 'mov-womens-suffrage',
      name: 'Nineteenth Amendment',
      kind: 'law',
      summary: 'Constitutional amendment that prohibited voting discrimination on the basis of sex.',
      notes: null,
      tags: ['law', 'constitution'],
      sourcesOfTruth: ['U.S. Constitution'],
      sourceEntityIds: []
    }
  ],
  practices: [
    {
      id: 'pr-petition-campaigns',
      movementId: 'mov-womens-suffrage',
      name: 'Petition Campaigns',
      kind: 'advocacy',
      description: 'Organizing signatures and petitions to legislators demanding voting rights for women.',
      frequency: 'other',
      isPublic: true,
      notes: null,
      tags: ['advocacy', 'petition'],
      involvedEntityIds: ['ent-elizabeth-stanton', 'ent-susan-anthony'],
      instructionsTextIds: ['txt-seneca-falls'],
      supportingClaimIds: ['clm-vote-as-right'],
      sourcesOfTruth: ['movement records'],
      sourceEntityIds: []
    },
    {
      id: 'pr-public-rallies',
      movementId: 'mov-womens-suffrage',
      name: 'Public Rallies and Marches',
      kind: 'demonstration',
      description: 'Mass meetings, parades, and marches to raise awareness and press for suffrage.',
      frequency: 'other',
      isPublic: true,
      notes: null,
      tags: ['rally', 'march'],
      involvedEntityIds: ['ent-susan-anthony', 'ent-womens-rights'],
      instructionsTextIds: [],
      supportingClaimIds: ['clm-equal-citizenship'],
      sourcesOfTruth: ['movement records'],
      sourceEntityIds: []
    }
  ],
  events: [
    {
      id: 'ev-seneca-falls-1848',
      movementId: 'mov-womens-suffrage',
      name: 'Seneca Falls Convention (1848)',
      description: 'Convention that issued the Declaration of Sentiments and sparked organized suffrage campaigning.',
      recurrence: 'once',
      timingRule: 'July 19–20, 1848',
      notes: null,
      tags: ['convention', 'organizing'],
      mainPracticeIds: ['pr-petition-campaigns'],
      mainEntityIds: ['ent-elizabeth-stanton'],
      readingTextIds: ['txt-seneca-falls'],
      supportingClaimIds: ['clm-vote-as-right']
    },
    {
      id: 'ev-ratification-1920',
      movementId: 'mov-womens-suffrage',
      name: 'Ratification of the Nineteenth Amendment (1920)',
      description: 'Final ratification milestone securing the right to vote for women across the United States.',
      recurrence: 'once',
      timingRule: 'August 18, 1920',
      notes: null,
      tags: ['ratification', 'victory'],
      mainPracticeIds: ['pr-public-rallies'],
      mainEntityIds: ['ent-nineteenth-amendment'],
      readingTextIds: ['txt-nineteenth-amendment'],
      supportingClaimIds: ['clm-equal-citizenship']
    }
  ],
  rules: [
    {
      id: 'rl-no-discrimination-on-sex',
      movementId: 'mov-womens-suffrage',
      shortText: 'Voting rights should not be denied or abridged on account of sex.',
      kind: 'must_not_do',
      details: 'Laws and policies must avoid discriminatory barriers that exclude women from the franchise.',
      appliesTo: ['legislators', 'election officials'],
      domain: ['law', 'civic'],
      tags: ['non_discrimination'],
      supportingTextIds: ['txt-nineteenth-amendment'],
      supportingClaimIds: ['clm-vote-as-right'],
      relatedPracticeIds: [],
      sourcesOfTruth: ['U.S. Constitution'],
      sourceEntityIds: ['ent-nineteenth-amendment']
    }
  ],
  claims: [
    {
      id: 'clm-vote-as-right',
      movementId: 'mov-womens-suffrage',
      text: 'Voting is a natural right of citizens that should be extended to women on equal terms with men.',
      category: 'political_theory',
      tags: ['rights', 'citizenship'],
      sourceTextIds: ['txt-seneca-falls'],
      aboutEntityIds: ['ent-womens-rights'],
      sourcesOfTruth: ['Declaration of Sentiments'],
      sourceEntityIds: [],
      notes: null
    },
    {
      id: 'clm-equal-citizenship',
      movementId: 'mov-womens-suffrage',
      text: 'Equal citizenship requires equal participation in elections and governance.',
      category: 'political_theory',
      tags: ['citizenship', 'equality'],
      sourceTextIds: ['txt-nineteenth-amendment'],
      aboutEntityIds: ['ent-womens-rights', 'ent-nineteenth-amendment'],
      sourcesOfTruth: ['U.S. Constitution'],
      sourceEntityIds: ['ent-nineteenth-amendment'],
      notes: null
    }
  ],
  media: [
    {
      id: 'med-rally-photo',
      movementId: 'mov-womens-suffrage',
      kind: 'image',
      uri: 'https://example.com/images/suffrage-rally.jpg',
      title: 'Suffrage Rally',
      description: 'Historical photograph of a public march advocating for the vote.',
      tags: ['rally', 'history'],
      linkedEntityIds: ['ent-susan-anthony'],
      linkedPracticeIds: ['pr-public-rallies'],
      linkedEventIds: ['ev-ratification-1920'],
      linkedTextIds: []
    }
  ],
  notes: [
    {
      id: 'note-suffrage-meta',
      movementId: 'mov-womens-suffrage',
      targetType: 'Movement',
      targetId: 'mov-womens-suffrage',
      author: 'system',
      body: 'Illustrative snapshot of the U.S. women’s suffrage movement highlighting key figures and milestones.',
      context: 'designer',
      tags: ['meta', 'example']
    }
  ],
  relations: [
    {
      id: 'rel-stanton-leads-suffrage',
      movementId: 'mov-womens-suffrage',
      fromEntityId: 'ent-elizabeth-stanton',
      toEntityId: 'ent-womens-rights',
      relationType: 'advocates_for',
      tags: ['leadership'],
      supportingClaimIds: ['clm-vote-as-right'],
      sourcesOfTruth: ['historical accounts'],
      sourceEntityIds: [],
      notes: 'Links Stanton’s advocacy to the broader cause of women’s civil rights.'
    }
  ]
};

if (typeof module !== 'undefined') {
  module.exports = data;
}

if (typeof window !== 'undefined') {
  window.movementDatasets = window.movementDatasets || [];
  window.movementDatasets.push(data);
}
