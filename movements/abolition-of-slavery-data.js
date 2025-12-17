(function registerMovementDataset() {
const dataset = {
  "version": "3.5",
  "movements": [
    {
      "id": "mov-abolition",
      "name": "Abolition of Slavery",
      "shortName": "Abolition",
      "summary": "A social, spiritual, and political movement dedicated to ending the transatlantic slave trade and abolishing slavery, culminating in emancipation laws and constitutional change.",
      "notes": null,
      "tags": [
        "abolition",
        "emancipation",
        "human_rights",
        "anti_slavery"
      ]
    }
  ],
  "textCollections": [
    {
      "id": "tc-abolition-voices",
      "movementId": "mov-abolition",
      "name": "Abolitionist Voices",
      "description": "First-person narratives, speeches, and journalism that exposed the realities of slavery and called for immediate emancipation.",
      "tags": [
        "narrative",
        "speech",
        "journalism"
      ],
      "rootTextIds": [
        "txt-equiano-narrative",
        "txt-douglass-fourth-july",
        "txt-garrison-liberator-opening"
      ]
    },
    {
      "id": "tc-abolition-laws",
      "movementId": "mov-abolition",
      "name": "Legal Milestones",
      "description": "Statutes and constitutional changes that outlawed the slave trade and slavery in the Atlantic world.",
      "tags": [
        "law",
        "constitution",
        "emancipation"
      ],
      "rootTextIds": [
        "txt-slave-trade-act-1807",
        "txt-emancipation-proclamation",
        "txt-thirteenth-amendment"
      ]
    }
  ],
  "texts": [
    {
      "id": "txt-equiano-narrative",
      "movementId": "mov-abolition",
      "parentId": null,
      "level": "work",
      "title": "The Interesting Narrative of the Life of Olaudah Equiano",
      "label": "Equiano Narrative",
      "content": "An autobiographical account detailing Equiano's capture, enslavement, and self-purchase, used widely by abolitionists to show the humanity of enslaved Africans and the brutality of the trade.",
      "mainFunction": "testimony",
      "tags": [
        "memoir",
        "abolition",
        "first_person"
      ],
      "mentionsEntityIds": [
        "ent-olaudah-equiano",
        "ent-abolition-societies"
      ]
    },
    {
      "id": "txt-douglass-fourth-july",
      "movementId": "mov-abolition",
      "parentId": null,
      "level": "work",
      "title": "What to the Slave Is the Fourth of July?",
      "label": "Douglass Fourth of July Speech",
      "content": "Frederick Douglass contrasts American ideals of liberty with the ongoing reality of slavery, indicting national hypocrisy while urging immediate emancipation.",
      "mainFunction": "prophetic",
      "tags": [
        "speech",
        "critique",
        "abolition"
      ],
      "mentionsEntityIds": [
        "ent-frederick-douglass",
        "ent-abolition-movement"
      ]
    },
    {
      "id": "txt-garrison-liberator-opening",
      "movementId": "mov-abolition",
      "parentId": null,
      "level": "work",
      "title": "The Liberator, Issue No. 1 (1831) Preface",
      "label": "Liberator Opening Pledge",
      "content": "William Lloyd Garrison declares his uncompromising stance against slavery, promising to be as harsh as truth and as uncompromising as justice in the pages of The Liberator.",
      "mainFunction": "manifesto",
      "tags": [
        "journalism",
        "manifesto",
        "abolition"
      ],
      "mentionsEntityIds": [
        "ent-william-garrison",
        "ent-liberator-newspaper"
      ]
    },
    {
      "id": "txt-slave-trade-act-1807",
      "movementId": "mov-abolition",
      "parentId": null,
      "level": "rule",
      "title": "British Slave Trade Act (1807)",
      "label": "Slave Trade Act 1807",
      "content": "Act of Parliament prohibiting British ships from participating in the transatlantic slave trade and empowering enforcement against traffickers.",
      "mainFunction": "rule",
      "tags": [
        "law",
        "britain",
        "trade"
      ],
      "mentionsEntityIds": [
        "ent-british-parliament",
        "ent-abolition-movement"
      ]
    },
    {
      "id": "txt-emancipation-proclamation",
      "movementId": "mov-abolition",
      "parentId": null,
      "level": "rule",
      "title": "Emancipation Proclamation (1863)",
      "label": "Emancipation Proclamation",
      "content": "Executive order issued by U.S. President Abraham Lincoln declaring that enslaved people in rebelling states were to be freed as of January 1, 1863.",
      "mainFunction": "rule",
      "tags": [
        "law",
        "united_states",
        "civil_war"
      ],
      "mentionsEntityIds": [
        "ent-abraham-lincoln",
        "ent-abolition-movement"
      ]
    },
    {
      "id": "txt-thirteenth-amendment",
      "movementId": "mov-abolition",
      "parentId": null,
      "level": "rule",
      "title": "Thirteenth Amendment (1865)",
      "label": "Thirteenth Amendment",
      "content": "Amendment to the U.S. Constitution abolishing slavery and involuntary servitude, except as punishment for a crime, throughout the United States.",
      "mainFunction": "rule",
      "tags": [
        "constitution",
        "united_states",
        "abolition"
      ],
      "mentionsEntityIds": [
        "ent-us-congress",
        "ent-abolition-movement"
      ]
    }
  ],
  "entities": [
    {
      "id": "ent-abolition-movement",
      "movementId": "mov-abolition",
      "name": "Abolitionist Movement",
      "kind": "movement",
      "summary": "Networks of activists, writers, and faith communities working to end slavery and the trade that sustained it.",
      "notes": null,
      "tags": [
        "movement",
        "network"
      ],
      "sourcesOfTruth": [
        "abolition society records"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-abolition-societies",
      "movementId": "mov-abolition",
      "name": "Abolition Societies",
      "kind": "organization",
      "summary": "Local and national organizations such as the Society for Effecting the Abolition of the Slave Trade that coordinated petitions, boycotts, and publications.",
      "notes": null,
      "tags": [
        "organization",
        "advocacy"
      ],
      "sourcesOfTruth": [
        "society minutes",
        "pamphlets"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-olaudah-equiano",
      "movementId": "mov-abolition",
      "name": "Olaudah Equiano",
      "kind": "being",
      "summary": "Formerly enslaved author whose bestselling narrative fueled British and American abolitionist campaigns.",
      "notes": null,
      "tags": [
        "author",
        "survivor"
      ],
      "sourcesOfTruth": [
        "Equiano narrative"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-frederick-douglass",
      "movementId": "mov-abolition",
      "name": "Frederick Douglass",
      "kind": "being",
      "summary": "Escaped slave, orator, and publisher whose speeches and writing urged immediate abolition and equal citizenship.",
      "notes": null,
      "tags": [
        "orator",
        "editor",
        "abolition"
      ],
      "sourcesOfTruth": [
        "Douglass speeches",
        "The North Star"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-william-garrison",
      "movementId": "mov-abolition",
      "name": "William Lloyd Garrison",
      "kind": "being",
      "summary": "Publisher of The Liberator and a leading voice for immediate emancipation and non-compromise with slavery.",
      "notes": null,
      "tags": [
        "journalist",
        "organizer"
      ],
      "sourcesOfTruth": [
        "The Liberator"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-abraham-lincoln",
      "movementId": "mov-abolition",
      "name": "Abraham Lincoln",
      "kind": "being",
      "summary": "U.S. president who issued the Emancipation Proclamation and advocated the Thirteenth Amendment to abolish slavery.",
      "notes": null,
      "tags": [
        "president",
        "lawgiver"
      ],
      "sourcesOfTruth": [
        "presidential papers",
        "civil war dispatches"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-british-parliament",
      "movementId": "mov-abolition",
      "name": "British Parliament",
      "kind": "organization",
      "summary": "Legislative body that passed the 1807 Act abolishing British involvement in the transatlantic slave trade.",
      "notes": null,
      "tags": [
        "government",
        "law"
      ],
      "sourcesOfTruth": [
        "parliamentary records"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-us-congress",
      "movementId": "mov-abolition",
      "name": "United States Congress",
      "kind": "organization",
      "summary": "Federal legislature that proposed and ratified the Thirteenth Amendment abolishing slavery in the United States.",
      "notes": null,
      "tags": [
        "government",
        "law"
      ],
      "sourcesOfTruth": [
        "congressional record"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-liberator-newspaper",
      "movementId": "mov-abolition",
      "name": "The Liberator",
      "kind": "work",
      "summary": "A weekly abolitionist newspaper printed in Boston that campaigned for immediate emancipation.",
      "notes": null,
      "tags": [
        "newspaper",
        "abolition"
      ],
      "sourcesOfTruth": [
        "Garrison writings"
      ],
      "sourceEntityIds": []
    }
  ],
  "practices": [],
  "events": [],
  "rules": [],
  "claims": [],
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
