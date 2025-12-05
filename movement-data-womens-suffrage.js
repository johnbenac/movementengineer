const womensSuffrageData = {
  version: '3.4',
  movements: [
    {
      id: 'mov-womens-suffrage',
      name: "Women's Suffrage Movement",
      shortName: 'Suffrage',
      summary:
        "The women's suffrage movement organized campaigns, petitions, and protests to secure voting rights for women, culminating in the Nineteenth Amendment to the U.S. Constitution.",
      notes: null,
      tags: ['suffrage', 'civil-rights', 'democracy']
    }
  ],
  textCollections: [
    {
      id: 'tc-suffrage-core-texts',
      movementId: 'mov-womens-suffrage',
      name: 'Core Organizing Texts',
      description: 'Foundational declarations and organizing documents that fueled suffrage activism.',
      tags: ['organizing', 'political'],
      rootTextIds: ['txt-seneca-falls-declaration', 'txt-19th-amendment']
    }
  ],
  texts: [
    {
      id: 'txt-seneca-falls-declaration',
      movementId: 'mov-womens-suffrage',
      parentId: null,
      level: 'work',
      title: 'Declaration of Sentiments (1848)',
      label: 'Declaration of Sentiments',
      content:
        'The Declaration of Sentiments modeled on the Declaration of Independence, asserting that women are endowed with the same inalienable rights as men and demanding suffrage.',
      mainFunction: 'teaching',
      tags: ['declaration', 'rights'],
      mentionsEntityIds: ['ent-elizabeth-stanton', 'ent-lucretia-mott', 'ent-womens-suffrage-movement']
    },
    {
      id: 'txt-19th-amendment',
      movementId: 'mov-womens-suffrage',
      parentId: null,
      level: 'work',
      title: 'Nineteenth Amendment (1920)',
      label: '19th Amendment',
      content:
        'The amendment to the U.S. Constitution prohibiting the denial of the right to vote on the basis of sex.',
      mainFunction: 'law',
      tags: ['law', 'constitution'],
      mentionsEntityIds: ['ent-nineteenth-amendment', 'ent-suffrage-voters']
    },
    {
      id: 'txt-anthony-trial-defense',
      movementId: 'mov-womens-suffrage',
      parentId: null,
      level: 'passage',
      title: 'Susan B. Anthony Trial Statement',
      label: 'Anthony Trial Statement',
      content:
        'Anthony argued that denying women the vote violated fundamental principles of citizenship and the Constitution.',
      mainFunction: 'argument',
      tags: ['trial', 'argument'],
      mentionsEntityIds: ['ent-susan-anthony', 'ent-womens-suffrage-movement']
    }
  ],
  entities: [
    {
      id: 'ent-womens-suffrage-movement',
      movementId: 'mov-womens-suffrage',
      name: "Women's Suffrage Movement",
      summary: 'The broad coalition of activists advocating for women to gain the right to vote.',
      tags: ['movement', 'activism']
    },
    {
      id: 'ent-elizabeth-stanton',
      movementId: 'mov-womens-suffrage',
      name: 'Elizabeth Cady Stanton',
      summary: 'Co-organizer of the Seneca Falls Convention and co-author of the Declaration of Sentiments.',
      tags: ['leader', 'author']
    },
    {
      id: 'ent-lucretia-mott',
      movementId: 'mov-womens-suffrage',
      name: 'Lucretia Mott',
      summary: 'Quaker minister and abolitionist who co-led the Seneca Falls Convention.',
      tags: ['leader', 'organizer']
    },
    {
      id: 'ent-susan-anthony',
      movementId: 'mov-womens-suffrage',
      name: 'Susan B. Anthony',
      summary: 'Prominent suffragist who organized campaigns, delivered speeches, and faced trial for voting.',
      tags: ['leader', 'organizer']
    },
    {
      id: 'ent-ida-wells',
      movementId: 'mov-womens-suffrage',
      name: 'Ida B. Wells-Barnett',
      summary: 'Journalist and activist who fought for suffrage and highlighted racial justice issues within the movement.',
      tags: ['journalist', 'organizer']
    },
    {
      id: 'ent-nawsa',
      movementId: 'mov-womens-suffrage',
      name: 'National American Woman Suffrage Association (NAWSA)',
      summary: 'National organization that coordinated state-level campaigns for women’s voting rights.',
      tags: ['organization']
    },
    {
      id: 'ent-nwp',
      movementId: 'mov-womens-suffrage',
      name: 'National Woman’s Party (NWP)',
      summary: 'Militant suffrage organization known for picketing the White House and pushing for a federal amendment.',
      tags: ['organization']
    },
    {
      id: 'ent-seneca-falls',
      movementId: 'mov-womens-suffrage',
      name: 'Seneca Falls Convention',
      summary: '1848 convention in New York that launched a formal suffrage campaign.',
      tags: ['event']
    },
    {
      id: 'ent-nineteenth-amendment',
      movementId: 'mov-womens-suffrage',
      name: 'Nineteenth Amendment',
      summary: 'Amendment granting women the right to vote in the United States.',
      tags: ['law']
    },
    {
      id: 'ent-suffrage-voters',
      movementId: 'mov-womens-suffrage',
      name: 'Women Voters',
      summary: 'Women empowered to vote following the success of the movement.',
      tags: ['people']
    }
  ],
  practices: [
    {
      id: 'pr-conventions',
      movementId: 'mov-womens-suffrage',
      name: 'Organize conventions and rallies',
      summary: 'Gather activists to debate, coordinate, and publicize the demand for suffrage.',
      tags: ['organizing', 'advocacy'],
      involvedEntityIds: ['ent-elizabeth-stanton', 'ent-lucretia-mott', 'ent-womens-suffrage-movement'],
      supportingClaimIds: ['clm-equal-citizenship']
    },
    {
      id: 'pr-parades-pickets',
      movementId: 'mov-womens-suffrage',
      name: 'Stage parades and pickets',
      summary: 'Use public demonstrations to pressure lawmakers and keep suffrage in the headlines.',
      tags: ['protest'],
      involvedEntityIds: ['ent-nwp', 'ent-susan-anthony', 'ent-ida-wells'],
      supportingClaimIds: ['clm-political-voice']
    }
  ],
  events: [
    {
      id: 'ev-seneca-falls-1848',
      movementId: 'mov-womens-suffrage',
      name: 'Seneca Falls Convention',
      summary: 'First women’s rights convention where the Declaration of Sentiments was adopted.',
      tags: ['convention'],
      primaryEntityIds: ['ent-seneca-falls'],
      relatedEntityIds: ['ent-elizabeth-stanton', 'ent-lucretia-mott'],
      relatedPracticeIds: ['pr-conventions'],
      relatedTextIds: ['txt-seneca-falls-declaration']
    },
    {
      id: 'ev-19th-ratified-1920',
      movementId: 'mov-womens-suffrage',
      name: 'Ratification of the Nineteenth Amendment',
      summary: 'Final ratification of the amendment secured voting rights for women nationwide.',
      tags: ['political-win'],
      primaryEntityIds: ['ent-nineteenth-amendment'],
      relatedEntityIds: ['ent-nawsa', 'ent-nwp'],
      relatedPracticeIds: ['pr-parades-pickets'],
      relatedTextIds: ['txt-19th-amendment']
    }
  ],
  rules: [],
  claims: [
    {
      id: 'clm-equal-citizenship',
      movementId: 'mov-womens-suffrage',
      title: 'Women deserve equal citizenship',
      summary: 'Because women are citizens, they should exercise the full rights of citizenship, including voting.',
      tags: ['rights', 'citizenship'],
      supportingClaimIds: [],
      sourcesOfTruth: ['Declaration of Sentiments'],
      sourceEntityIds: ['ent-womens-suffrage-movement']
    },
    {
      id: 'clm-political-voice',
      movementId: 'mov-womens-suffrage',
      title: 'Political decisions require women’s voice',
      summary: 'Laws that govern women’s lives should not be made without their participation in the electorate.',
      tags: ['representation'],
      supportingClaimIds: ['clm-equal-citizenship'],
      sourcesOfTruth: ['Anthony trial statement'],
      sourceEntityIds: ['ent-susan-anthony']
    }
  ],
  media: [
    {
      id: 'media-the-revolution',
      movementId: 'mov-womens-suffrage',
      name: 'The Revolution Newspaper',
      summary: 'Publication co-founded by Anthony and Stanton to advocate for suffrage and women’s rights.',
      tags: ['publication'],
      relatedEntityIds: ['ent-susan-anthony', 'ent-elizabeth-stanton']
    }
  ],
  notes: [],
  relations: [
    {
      id: 'rel-nawsa-to-amendment',
      movementId: 'mov-womens-suffrage',
      fromEntityId: 'ent-nawsa',
      toEntityId: 'ent-nineteenth-amendment',
      type: 'advocated',
      summary: 'NAWSA advocacy and lobbying helped secure the federal amendment.'
    }
  ]
};

if (typeof module !== 'undefined') {
  module.exports = womensSuffrageData;
} else if (typeof window !== 'undefined') {
  window.movementDataSources = window.movementDataSources || [];
  window.movementDataSources.push(womensSuffrageData);
}
