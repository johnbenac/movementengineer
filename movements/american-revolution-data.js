(function registerMovementDataset() {
const dataset = {
  "version": "3.5",
  "movements": [
    {
      "id": "mov-american-revolution",
      "name": "American Revolution",
      "shortName": "American Revolution",
      "summary": "A political revolution in which the Thirteen Colonies organized to secure independence from British rule and establish self-government.",
      "notes": null,
      "tags": [
        "political",
        "independence",
        "revolution"
      ]
    }
  ],
  "textCollections": [
    {
      "id": "tc-american-revolution-foundations",
      "movementId": "mov-american-revolution",
      "name": "Foundational Declarations",
      "description": "Key statements asserting independence and outlining the early frame of government for the United States.",
      "tags": [
        "declaration",
        "law",
        "governance"
      ],
      "rootTextIds": [
        "txt-declaration-of-independence",
        "txt-articles-of-confederation"
      ]
    }
  ],
  "texts": [
    {
      "id": "txt-declaration-of-independence",
      "movementId": "mov-american-revolution",
      "parentId": null,
      "level": "work",
      "title": "Declaration of Independence",
      "label": "Declaration of Independence",
      "content": null,
      "mainFunction": "declaration",
      "tags": [
        "independence",
        "rights"
      ],
      "mentionsEntityIds": [
        "ent-continental-congress",
        "ent-king-george-iii",
        "ent-natural-rights"
      ]
    },
    {
      "id": "txt-declaration-preamble",
      "movementId": "mov-american-revolution",
      "parentId": "txt-declaration-of-independence",
      "level": "passage",
      "title": "Preamble Excerpt",
      "label": "Equality and rights preamble",
      "content": "We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights.",
      "mainFunction": "principle",
      "tags": [
        "rights",
        "equality"
      ],
      "mentionsEntityIds": [
        "ent-natural-rights"
      ]
    },
    {
      "id": "txt-articles-of-confederation",
      "movementId": "mov-american-revolution",
      "parentId": null,
      "level": "work",
      "title": "Articles of Confederation",
      "label": "Articles of Confederation",
      "content": null,
      "mainFunction": "constitution",
      "tags": [
        "confederation",
        "governance"
      ],
      "mentionsEntityIds": [
        "ent-continental-congress"
      ]
    },
    {
      "id": "txt-paris-treaty-1783",
      "movementId": "mov-american-revolution",
      "parentId": null,
      "level": "work",
      "title": "Treaty of Paris (1783)",
      "label": "Treaty of Paris",
      "content": null,
      "mainFunction": "treaty",
      "tags": [
        "diplomacy",
        "peace"
      ],
      "mentionsEntityIds": [
        "ent-continental-congress",
        "ent-king-george-iii"
      ]
    }
  ],
  "entities": [
    {
      "id": "ent-continental-congress",
      "movementId": "mov-american-revolution",
      "name": "Continental Congress",
      "kind": "organization",
      "summary": "Deliberative assembly of colonial delegates that coordinated resistance and ultimately declared independence.",
      "notes": null,
      "tags": [
        "governance",
        "legislative"
      ],
      "sourcesOfTruth": [
        "Congressional journals"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-king-george-iii",
      "movementId": "mov-american-revolution",
      "name": "King George III",
      "kind": "person",
      "summary": "British monarch whose policies toward the colonies were cited as grievances by American revolutionaries.",
      "notes": null,
      "tags": [
        "monarch",
        "british"
      ],
      "sourcesOfTruth": [
        "British crown records"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-natural-rights",
      "movementId": "mov-american-revolution",
      "name": "Natural Rights",
      "kind": "idea",
      "summary": "The belief that certain rights are inherent and not granted by governments, grounding the revolutionaries' claims.",
      "notes": null,
      "tags": [
        "rights",
        "philosophy"
      ],
      "sourcesOfTruth": [
        "Enlightenment philosophy"
      ],
      "sourceEntityIds": []
    }
  ],
  "practices": [
    {
      "id": "pr-committees-of-correspondence",
      "movementId": "mov-american-revolution",
      "name": "Committees of Correspondence",
      "kind": "service",
      "description": "Local committees shared letters to coordinate colonial responses to British policies.",
      "frequency": "other",
      "isPublic": false,
      "notes": null,
      "tags": [
        "organizing",
        "communication"
      ],
      "involvedEntityIds": [
        "ent-continental-congress"
      ],
      "instructionsTextIds": [],
      "supportingClaimIds": [
        "clm-defense-of-rights"
      ],
      "sourcesOfTruth": [
        "colonial correspondence"
      ],
      "sourceEntityIds": []
    }
  ],
  "events": [
    {
      "id": "ev-lexington-concord",
      "movementId": "mov-american-revolution",
      "name": "Battles of Lexington and Concord",
      "eventType": "conflict",
      "startDate": "1775-04-19",
      "endDate": "1775-04-19",
      "location": "Massachusetts",
      "summary": "Initial armed clashes between colonial militia and British troops, marking the start of open conflict.",
      "tags": [
        "conflict",
        "military"
      ],
      "involvedEntityIds": [
        "ent-continental-congress",
        "ent-king-george-iii"
      ],
      "relatedTextIds": [
        "txt-declaration-of-independence"
      ],
      "sourcesOfTruth": [
        "military histories"
      ],
      "sourceEntityIds": []
    }
  ],
  "rules": [],
  "claims": [
    {
      "id": "clm-defense-of-rights",
      "movementId": "mov-american-revolution",
      "claim": "Colonists possess inherent rights that must be defended against Parliamentary overreach.",
      "notes": null,
      "tags": [
        "rights",
        "resistance"
      ],
      "supportingClaimIds": [],
      "sourcesOfTruth": [
        "pamphlets",
        "town resolutions"
      ],
      "sourceEntityIds": []
    }
  ],
  "media": [],
  "notes": []
};

if (typeof module !== 'undefined') {
  module.exports = dataset;
} else if (typeof window !== 'undefined') {
  window.movementDatasets = window.movementDatasets || [];
  window.movementDatasets.push(dataset);
}
})();
