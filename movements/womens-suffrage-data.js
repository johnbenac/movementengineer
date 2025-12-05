(function registerMovementDataset() {
const dataset = {
  "version": "3.4",
  "movements": [
    {
      "id": "mov-womens-suffrage",
      "name": "Women's Suffrage Movement",
      "shortName": "Suffrage",
      "summary": "A political and social movement that organized to secure women's right to vote through activism, advocacy, and legal reform.",
      "notes": null,
      "tags": [
        "political",
        "equality",
        "rights"
      ]
    }
  ],
  "textCollections": [
    {
      "id": "tc-suffrage-key-texts",
      "movementId": "mov-womens-suffrage",
      "name": "Canonical Statements and Laws",
      "description": "Foundational canonical declarations and legal milestones that defined the suffrage cause.",
      "tags": [
        "declaration",
        "law",
        "canon"
      ],
      "rootTextIds": [
        "txt-seneca-falls-declaration",
        "txt-nineteenth-amendment"
      ]
    }
  ],
  "texts": [
    {
      "id": "txt-seneca-falls-declaration",
      "movementId": "mov-womens-suffrage",
      "parentId": null,
      "level": "work",
      "title": "Declaration of Sentiments (1848)",
      "label": "Declaration of Sentiments",
      "content": "A statement issued by delegates at the Seneca Falls Convention asserting women's equality and calling for the franchise.",
      "mainFunction": "teaching",
      "tags": [
        "declaration",
        "rights"
      ],
      "mentionsEntityIds": [
        "ent-seneca-falls-convention",
        "ent-elizabeth-stanton"
      ]
    },
    {
      "id": "txt-nineteenth-amendment",
      "movementId": "mov-womens-suffrage",
      "parentId": null,
      "level": "work",
      "title": "Nineteenth Amendment",
      "label": "Nineteenth Amendment",
      "content": "The amendment to the United States Constitution prohibiting voter discrimination on the basis of sex.",
      "mainFunction": "rule",
      "tags": [
        "law",
        "constitution"
      ],
      "mentionsEntityIds": [
        "ent-nineteenth-amendment",
        "ent-voting-rights"
      ]
    }
  ],
  "entities": [
    {
      "id": "ent-elizabeth-stanton",
      "movementId": "mov-womens-suffrage",
      "name": "Elizabeth Cady Stanton",
      "kind": "being",
      "summary": "Writer and organizer who co-convened the Seneca Falls Convention and co-authored the Declaration of Sentiments.",
      "notes": null,
      "tags": [
        "leader",
        "organizer"
      ],
      "sourcesOfTruth": [
        "historical accounts"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-susan-b-anthony",
      "movementId": "mov-womens-suffrage",
      "name": "Susan B. Anthony",
      "kind": "being",
      "summary": "National organizer whose speeches, petitions, and civil disobedience kept suffrage in public view.",
      "notes": null,
      "tags": [
        "leader",
        "organizer"
      ],
      "sourcesOfTruth": [
        "historical accounts"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sojourner-truth",
      "movementId": "mov-womens-suffrage",
      "name": "Sojourner Truth",
      "kind": "being",
      "summary": "Abolitionist and women's rights advocate known for linking racial justice to the fight for suffrage.",
      "notes": null,
      "tags": [
        "advocate",
        "abolition"
      ],
      "sourcesOfTruth": [
        "historical accounts"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-seneca-falls-convention",
      "movementId": "mov-womens-suffrage",
      "name": "Seneca Falls Convention",
      "kind": "place",
      "summary": "The 1848 gathering where activists issued the Declaration of Sentiments demanding equal rights for women.",
      "notes": null,
      "tags": [
        "convention",
        "origin"
      ],
      "sourcesOfTruth": [
        "historical accounts"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-nineteenth-amendment",
      "movementId": "mov-womens-suffrage",
      "name": "Nineteenth Amendment",
      "kind": "idea",
      "summary": "The constitutional amendment that legally secured women's right to vote in the United States.",
      "notes": null,
      "tags": [
        "law",
        "amendment"
      ],
      "sourcesOfTruth": [
        "legal text"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-voting-rights",
      "movementId": "mov-womens-suffrage",
      "name": "Voting Rights",
      "kind": "idea",
      "summary": "The principle that political participation through voting should be available without discrimination.",
      "notes": null,
      "tags": [
        "rights",
        "democracy"
      ],
      "sourcesOfTruth": [
        "constitutional law"
      ],
      "sourceEntityIds": []
    }
  ],
  "practices": [
    {
      "id": "pr-petition-campaigns",
      "movementId": "mov-womens-suffrage",
      "name": "Petition Campaigns",
      "kind": "service",
      "description": "Organized drives collecting signatures to pressure legislators to support suffrage bills and amendments.",
      "frequency": "other",
      "isPublic": true,
      "notes": null,
      "tags": [
        "advocacy",
        "petition"
      ],
      "involvedEntityIds": [
        "ent-elizabeth-stanton",
        "ent-susan-b-anthony",
        "ent-voting-rights"
      ],
      "instructionsTextIds": [
        "txt-seneca-falls-declaration"
      ],
      "supportingClaimIds": [
        "clm-vote-equality"
      ],
      "sourcesOfTruth": [
        "movement archives"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-public-rallies",
      "movementId": "mov-womens-suffrage",
      "name": "Public Rallies and Marches",
      "kind": "service",
      "description": "Coordinated public gatherings, parades, and demonstrations to raise awareness for voting rights.",
      "frequency": "other",
      "isPublic": true,
      "notes": "Often staged in state capitals or major cities before key votes.",
      "tags": [
        "advocacy",
        "demonstration"
      ],
      "involvedEntityIds": [
        "ent-susan-b-anthony",
        "ent-sojourner-truth",
        "ent-voting-rights"
      ],
      "instructionsTextIds": [],
      "supportingClaimIds": [
        "clm-vote-equality"
      ],
      "sourcesOfTruth": [
        "newspaper reports"
      ],
      "sourceEntityIds": []
    }
  ],
  "events": [
    {
      "id": "ev-seneca-falls-1848",
      "movementId": "mov-womens-suffrage",
      "name": "Seneca Falls Convention",
      "description": "The first women's rights convention, where delegates issued the Declaration of Sentiments.",
      "recurrence": "once",
      "timingRule": "July 19-20, 1848 in Seneca Falls, New York.",
      "notes": null,
      "tags": [
        "convention",
        "origin"
      ],
      "mainPracticeIds": [
        "pr-petition-campaigns"
      ],
      "mainEntityIds": [
        "ent-seneca-falls-convention",
        "ent-elizabeth-stanton"
      ],
      "readingTextIds": [
        "txt-seneca-falls-declaration"
      ],
      "supportingClaimIds": [
        "clm-vote-equality"
      ]
    },
    {
      "id": "ev-ratification-1920",
      "movementId": "mov-womens-suffrage",
      "name": "Ratification of the Nineteenth Amendment",
      "description": "The legal milestone when the Nineteenth Amendment was ratified, securing women's voting rights.",
      "recurrence": "once",
      "timingRule": "August 18, 1920 across the United States.",
      "notes": null,
      "tags": [
        "ratification",
        "law"
      ],
      "mainPracticeIds": [
        "pr-petition-campaigns",
        "pr-public-rallies"
      ],
      "mainEntityIds": [
        "ent-nineteenth-amendment",
        "ent-voting-rights"
      ],
      "readingTextIds": [
        "txt-nineteenth-amendment"
      ],
      "supportingClaimIds": [
        "clm-vote-equality"
      ]
    }
  ],
  "rules": [
    {
      "id": "rl-nonviolent-advocacy",
      "movementId": "mov-womens-suffrage",
      "description": "Public demonstrations should remain nonviolent and focused on persuasive appeals to lawmakers and the public.",
      "kind": "should_do",
      "tags": [
        "nonviolence",
        "organizing"
      ],
      "supportingTextIds": [],
      "supportingClaimIds": [
        "clm-vote-equality"
      ],
      "relatedPracticeIds": [
        "pr-public-rallies"
      ],
      "sourcesOfTruth": [
        "organizing guidelines"
      ],
      "sourceEntityIds": [],
      "notes": null
    }
  ],
  "claims": [
    {
      "id": "clm-vote-equality",
      "movementId": "mov-womens-suffrage",
      "text": "Women and men deserve equal voting rights as a matter of democratic justice.",
      "category": "rights",
      "tags": [
        "equality",
        "suffrage"
      ],
      "sourceTextIds": [
        "txt-seneca-falls-declaration",
        "txt-nineteenth-amendment"
      ],
      "aboutEntityIds": [
        "ent-voting-rights",
        "ent-nineteenth-amendment"
      ],
      "sourcesOfTruth": [
        "legal text",
        "movement declarations"
      ],
      "sourceEntityIds": [],
      "notes": null
    }
  ],
  "media": [
    {
      "id": "med-suffrage-poster",
      "movementId": "mov-womens-suffrage",
      "kind": "image",
      "uri": "https://example.com/images/suffrage-poster.jpg",
      "title": "Votes for Women Poster",
      "description": "A poster used to advertise a suffrage rally and encourage attendance.",
      "tags": [
        "poster",
        "rally",
        "advocacy"
      ],
      "linkedEntityIds": [
        "ent-voting-rights"
      ],
      "linkedPracticeIds": [
        "pr-public-rallies"
      ],
      "linkedEventIds": [
        "ev-ratification-1920"
      ],
      "linkedTextIds": []
    }
  ],
  "notes": [
    {
      "id": "note-mov-suffrage-overview",
      "movementId": "mov-womens-suffrage",
      "targetType": "Movement",
      "targetId": "mov-womens-suffrage",
      "author": "system",
      "body": "A concise sample of suffrage data illustrating how non-religious movements can be modeled alongside faith traditions.",
      "context": "designer",
      "tags": [
        "meta",
        "example"
      ]
    }
  ],
  "relations": [
    {
      "id": "rel-rallies-support-amendment",
      "movementId": "mov-womens-suffrage",
      "fromEntityId": "ent-voting-rights",
      "toEntityId": "ent-nineteenth-amendment",
      "relationType": "supported_by",
      "tags": [
        "organizing"
      ],
      "supportingClaimIds": [
        "clm-vote-equality"
      ],
      "sourcesOfTruth": [
        "movement histories"
      ],
      "sourceEntityIds": [],
      "notes": "Organizing pressure connected the claim for equal voting rights to the legal amendment that enacted it."
    }
  ]
};

if (typeof module !== 'undefined') {
  module.exports = dataset;
} else if (typeof window !== 'undefined') {
  window.movementDatasets = window.movementDatasets || [];
  window.movementDatasets.push(dataset);
}
})();
