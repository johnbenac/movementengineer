const data = {
  "version": "3.4",
  "movements": [
    {
      "id": "mov-womens-suffrage",
      "name": "Women's Suffrage Movement",
      "shortName": "Suffrage",
      "summary": "A social and political movement advocating for women's right to vote and participate fully in civic life across the 19th and early 20th centuries.",
      "notes": null,
      "tags": ["political", "social", "rights"]
    }
  ],
  "textCollections": [
    {
      "id": "tc-suffrage-core-texts",
      "movementId": "mov-womens-suffrage",
      "name": "Core Suffrage Texts",
      "description": "Foundational declarations and amendments supporting women's voting rights.",
      "tags": ["declaration", "amendment"],
      "rootTextIds": ["txt-suffrage-root"]
    }
  ],
  "texts": [
    {
      "id": "txt-suffrage-root",
      "movementId": "mov-womens-suffrage",
      "parentId": null,
      "level": "work",
      "title": "Suffrage Milestones",
      "label": "Suffrage Texts",
      "content": null,
      "mainFunction": "record",
      "tags": ["timeline", "rights"],
      "mentionsEntityIds": ["ent-suffrage-activists", "ent-19th-amendment"]
    },
    {
      "id": "txt-declaration-of-sentiments",
      "movementId": "mov-womens-suffrage",
      "parentId": "txt-suffrage-root",
      "level": "passage",
      "title": "Declaration of Sentiments (excerpt)",
      "label": "Declaration Excerpt",
      "content": "We hold these truths to be self-evident: that all men and women are created equal.",
      "mainFunction": "teaching",
      "tags": ["declaration", "equality"],
      "mentionsEntityIds": ["ent-elizabeth-stanton"]
    },
    {
      "id": "txt-nineteenth-amendment",
      "movementId": "mov-womens-suffrage",
      "parentId": "txt-suffrage-root",
      "level": "passage",
      "title": "Nineteenth Amendment (summary)",
      "label": "19th Amendment",
      "content": "The right of citizens of the United States to vote shall not be denied or abridged on account of sex.",
      "mainFunction": "law",
      "tags": ["amendment", "law"],
      "mentionsEntityIds": ["ent-19th-amendment"]
    }
  ],
  "entities": [
    {
      "id": "ent-suffrage-activists",
      "movementId": "mov-womens-suffrage",
      "name": "Suffrage Activists",
      "kind": "group",
      "summary": "Networks of women and allies who organized for voting rights through petitions, conventions, and public campaigns.",
      "notes": null,
      "tags": ["activists", "organizers"],
      "sourcesOfTruth": ["Movement archives"],
      "sourceEntityIds": []
    },
    {
      "id": "ent-elizabeth-stanton",
      "movementId": "mov-womens-suffrage",
      "name": "Elizabeth Cady Stanton",
      "kind": "person",
      "summary": "Writer and activist who helped organize the Seneca Falls Convention and co-authored the Declaration of Sentiments.",
      "notes": null,
      "tags": ["leader", "writer"],
      "sourcesOfTruth": ["Declaration of Sentiments"],
      "sourceEntityIds": []
    },
    {
      "id": "ent-susan-b-anthony",
      "movementId": "mov-womens-suffrage",
      "name": "Susan B. Anthony",
      "kind": "person",
      "summary": "Prominent suffragist who led petitions, speeches, and legal challenges for women's voting rights.",
      "notes": null,
      "tags": ["leader", "speaker"],
      "sourcesOfTruth": ["Correspondence", "Newspaper coverage"],
      "sourceEntityIds": []
    },
    {
      "id": "ent-19th-amendment",
      "movementId": "mov-womens-suffrage",
      "name": "Nineteenth Amendment",
      "kind": "text",
      "summary": "United States constitutional amendment prohibiting the denial of the right to vote on the basis of sex.",
      "notes": null,
      "tags": ["law", "constitution"],
      "sourcesOfTruth": ["U.S. Constitution"],
      "sourceEntityIds": []
    }
  ],
  "practices": [
    {
      "id": "pr-suffrage-petitions",
      "movementId": "mov-womens-suffrage",
      "name": "Petition Drives",
      "description": "Coordinated petition campaigns urging legislators to recognize women's voting rights.",
      "tags": ["petition", "advocacy"],
      "involvedEntityIds": ["ent-suffrage-activists", "ent-susan-b-anthony"],
      "sourcesOfTruth": ["Petition archives"]
    },
    {
      "id": "pr-public-rallies",
      "movementId": "mov-womens-suffrage",
      "name": "Public Rallies",
      "description": "Marches, parades, and public meetings that raised awareness for suffrage.",
      "tags": ["rally", "awareness"],
      "involvedEntityIds": ["ent-suffrage-activists"],
      "sourcesOfTruth": ["Newspaper coverage"]
    }
  ],
  "events": [
    {
      "id": "evt-seneca-falls-1848",
      "movementId": "mov-womens-suffrage",
      "name": "Seneca Falls Convention",
      "date": "1848-07-19",
      "location": "Seneca Falls, New York",
      "description": "First women's rights convention where the Declaration of Sentiments was presented.",
      "tags": ["convention", "foundational"],
      "involvedEntityIds": ["ent-elizabeth-stanton", "ent-suffrage-activists"],
      "relatedTextIds": ["txt-declaration-of-sentiments"]
    },
    {
      "id": "evt-19th-amendment-ratification",
      "movementId": "mov-womens-suffrage",
      "name": "Ratification of the 19th Amendment",
      "date": "1920-08-18",
      "location": "United States",
      "description": "Certification of the constitutional amendment securing women's right to vote.",
      "tags": ["ratification", "victory"],
      "involvedEntityIds": ["ent-19th-amendment", "ent-suffrage-activists"],
      "relatedTextIds": ["txt-nineteenth-amendment"]
    }
  ],
  "rules": [
    {
      "id": "rl-coordinated-campaigns",
      "movementId": "mov-womens-suffrage",
      "name": "Coordinate campaigns across regions",
      "description": "Share messaging, materials, and schedules to keep local chapters aligned.",
      "tags": ["organization", "strategy"],
      "appliesToEntityIds": ["ent-suffrage-activists"],
      "sourcesOfTruth": ["Movement correspondence"]
    }
  ],
  "claims": [
    {
      "id": "clm-equal-vote-rights",
      "movementId": "mov-womens-suffrage",
      "movementScopes": ["internal", "external"],
      "claimKind": "belief",
      "summary": "Women possess the same natural right to vote as men.",
      "notes": null,
      "tags": ["rights", "equality"],
      "supportingEntityIds": ["ent-elizabeth-stanton"],
      "opposingEntityIds": [],
      "supportingPracticeIds": ["pr-suffrage-petitions"],
      "opposingPracticeIds": [],
      "supportingClaimIds": [],
      "supportingArgumentIds": [],
      "opposingArgumentIds": [],
      "supportingRuleIds": [],
      "supportingEventIds": ["evt-seneca-falls-1848"],
      "sourcesOfTruth": ["Declaration of Sentiments"],
      "sourceEntityIds": []
    }
  ],
  "media": [],
  "notes": [],
  "relations": []
};

if (typeof module !== 'undefined') {
  module.exports = data;
} else if (typeof window !== 'undefined') {
  window.movementDataSources = window.movementDataSources || [];
  window.movementDataSources.push(data);
}
