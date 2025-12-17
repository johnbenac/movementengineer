(function registerMovementDataset() {
const dataset = {
  "version": "3.5",
  "movements": [
    {
      "id": "mov-handwashing-hygiene",
      "name": "Handwashing and Hospital Hygiene Movement",
      "shortName": "Handwashing",
      "summary": "A public health movement that turned routine handwashing and environmental sanitation into core medical practice, driven by 19th-century reformers who linked cleanliness to survival in hospitals.",
      "notes": null,
      "tags": [
        "health",
        "hygiene",
        "culture"
      ]
    }
  ],
  "textCollections": [
    {
      "id": "tc-handwashing-foundations",
      "movementId": "mov-handwashing-hygiene",
      "name": "Foundational Hygiene Directives",
      "description": "Core writings that frame handwashing and sanitation as professional duties in healthcare.",
      "tags": [
        "guidance",
        "data",
        "reform"
      ],
      "rootTextIds": [
        "txt-notes-on-nursing-handwashing",
        "txt-semmelweis-lime-wash",
        "txt-nightingale-polar-diagram"
      ]
    }
  ],
  "texts": [
    {
      "id": "txt-notes-on-nursing-handwashing",
      "movementId": "mov-handwashing-hygiene",
      "parentId": null,
      "level": "work",
      "title": "Notes on Nursing: Handwashing Guidance",
      "label": "Notes on Nursing",
      "content": "Florence Nightingale instructs nurses to wash their hands very frequently, linking personal cleanliness to protecting patients and preserving their strength.",
      "mainFunction": "rule",
      "tags": [
        "hygiene",
        "instruction"
      ],
      "mentionsEntityIds": [
        "ent-florence-nightingale",
        "ent-notes-on-nursing",
        "ent-handwashing-protocol"
      ]
    },
    {
      "id": "txt-semmelweis-lime-wash",
      "movementId": "mov-handwashing-hygiene",
      "parentId": null,
      "level": "work",
      "title": "Semmelweis Chlorinated Lime Results",
      "label": "Semmelweis Data",
      "content": "Ignaz Semmelweis documents that washing with chlorinated lime cut mortality from childbed fever from near 18 percent to about 2 percent in the Vienna maternity clinic.",
      "mainFunction": "teaching",
      "tags": [
        "data",
        "evidence"
      ],
      "mentionsEntityIds": [
        "ent-ignaz-semmelweis",
        "ent-handwashing-protocol"
      ]
    },
    {
      "id": "txt-nightingale-polar-diagram",
      "movementId": "mov-handwashing-hygiene",
      "parentId": null,
      "level": "work",
      "title": "Crimean War Mortality Diagrams",
      "label": "Polar Area Diagrams",
      "content": "Nightingale's polar area diagrams visualize that preventable diseases, worsened by dirty wards, killed far more soldiers than battle wounds and that sanitation sharply reduced deaths.",
      "mainFunction": "story",
      "tags": [
        "data",
        "visual"
      ],
      "mentionsEntityIds": [
        "ent-florence-nightingale",
        "ent-polar-area-diagram",
        "ent-sanitary-commission"
      ]
    }
  ],
  "entities": [
    {
      "id": "ent-florence-nightingale",
      "movementId": "mov-handwashing-hygiene",
      "name": "Florence Nightingale",
      "kind": "being",
      "summary": "British nurse who reorganized Crimean War hospitals, enforced handwashing and cleanliness, and used data to prove sanitation saved soldiers' lives.",
      "notes": null,
      "tags": [
        "reformer",
        "nurse"
      ],
      "sourcesOfTruth": [
        "historical accounts"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-ignaz-semmelweis",
      "movementId": "mov-handwashing-hygiene",
      "name": "Ignaz Semmelweis",
      "kind": "being",
      "summary": "Physician who demonstrated that antiseptic handwashing drastically cut maternal deaths in the 1840s, providing an early evidence base for the hygiene movement.",
      "notes": null,
      "tags": [
        "physician",
        "evidence"
      ],
      "sourcesOfTruth": [
        "clinical reports"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sanitary-commission",
      "movementId": "mov-handwashing-hygiene",
      "name": "Sanitary Commission",
      "kind": "being",
      "summary": "Engineers and officials who improved drainage, ventilation, and cleanliness in Crimean War hospitals alongside Nightingale's nursing reforms.",
      "notes": null,
      "tags": [
        "infrastructure",
        "collaborator"
      ],
      "sourcesOfTruth": [
        "war records"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-handwashing-protocol",
      "movementId": "mov-handwashing-hygiene",
      "name": "Routine Handwashing Protocols",
      "kind": "idea",
      "summary": "Structured expectations that caregivers wash hands before and between patient contact to block infection transmission.",
      "notes": null,
      "tags": [
        "practice",
        "prevention"
      ],
      "sourcesOfTruth": [
        "hospital policies"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-notes-on-nursing",
      "movementId": "mov-handwashing-hygiene",
      "name": "Notes on Nursing",
      "kind": "object",
      "summary": "Nightingale's 1860 manual codifying cleanliness, ventilation, and handwashing as nursing duties.",
      "notes": null,
      "tags": [
        "manual",
        "education"
      ],
      "sourcesOfTruth": [
        "published text"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-polar-area-diagram",
      "movementId": "mov-handwashing-hygiene",
      "name": "Polar Area Diagram",
      "kind": "object",
      "summary": "Nightingale's circular graphic showing seasonal deaths from disease versus wounds, used to argue for sanitation funding.",
      "notes": null,
      "tags": [
        "data_viz",
        "evidence"
      ],
      "sourcesOfTruth": [
        "statistical reports"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-scutari-hospital",
      "movementId": "mov-handwashing-hygiene",
      "name": "Scutari Military Hospital",
      "kind": "place",
      "summary": "The main British military hospital near Istanbul where Nightingale enforced sanitation reforms during the Crimean War.",
      "notes": null,
      "tags": [
        "hospital",
        "crimean-war"
      ],
      "sourcesOfTruth": [
        "historical accounts"
      ],
      "sourceEntityIds": []
    }
  ],
  "practices": [
    {
      "id": "pr-handwashing-intervals",
      "movementId": "mov-handwashing-hygiene",
      "name": "Wash Hands Between Patients",
      "kind": "discipline",
      "description": "Clean hands with soap or antiseptic before entering wards and between every patient contact.",
      "frequency": "other",
      "isPublic": true,
      "notes": null,
      "tags": [
        "hygiene",
        "protocol"
      ],
      "involvedEntityIds": [
        "ent-handwashing-protocol",
        "ent-florence-nightingale",
        "ent-ignaz-semmelweis"
      ],
      "instructionsTextIds": [
        "txt-notes-on-nursing-handwashing",
        "txt-semmelweis-lime-wash"
      ],
      "supportingClaimIds": [
        "clm-cleanliness-saves-lives",
        "clm-handwashing-duty"
      ],
      "sourcesOfTruth": [
        "clinical protocols"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-sanitation-rounds",
      "movementId": "mov-handwashing-hygiene",
      "name": "Sanitation Rounds",
      "kind": "service",
      "description": "Inspect wards for ventilation, sewage, bedding, and water cleanliness; remove waste and scrub surfaces on a fixed schedule.",
      "frequency": "daily",
      "isPublic": false,
      "notes": null,
      "tags": [
        "environment",
        "prevention"
      ],
      "involvedEntityIds": [
        "ent-sanitary-commission",
        "ent-florence-nightingale"
      ],
      "instructionsTextIds": [
        "txt-nightingale-polar-diagram"
      ],
      "supportingClaimIds": [
        "clm-cleanliness-saves-lives"
      ],
      "sourcesOfTruth": [
        "hospital reports"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-hygiene-ledger",
      "movementId": "mov-handwashing-hygiene",
      "name": "Hygiene Ledger and Audits",
      "kind": "study",
      "description": "Record mortality, infections, and compliance with handwashing to demonstrate impact and adjust routines.",
      "frequency": "monthly",
      "isPublic": false,
      "notes": null,
      "tags": [
        "measurement",
        "feedback"
      ],
      "involvedEntityIds": [
        "ent-florence-nightingale",
        "ent-handwashing-protocol"
      ],
      "instructionsTextIds": [
        "txt-nightingale-polar-diagram"
      ],
      "supportingClaimIds": [
        "clm-cleanliness-saves-lives"
      ],
      "sourcesOfTruth": [
        "statistical reports"
      ],
      "sourceEntityIds": []
    }
  ],
  "events": [
    {
      "id": "ev-scutari-reforms-1854",
      "movementId": "mov-handwashing-hygiene",
      "name": "Scutari Sanitation Reforms",
      "description": "1854-1855 overhaul of the Scutari military hospital, adding ventilation, drainage, clean water, and routine handwashing for staff.",
      "recurrence": "once",
      "timingRule": "Beginning November 1854 and continuing through 1855 during the Crimean War.",
      "notes": null,
      "tags": [
        "reform",
        "crimean-war"
      ],
      "mainPracticeIds": [
        "pr-handwashing-intervals",
        "pr-sanitation-rounds"
      ],
      "mainEntityIds": [
        "ent-scutari-hospital",
        "ent-florence-nightingale",
        "ent-sanitary-commission"
      ],
      "readingTextIds": [
        "txt-nightingale-polar-diagram"
      ],
      "supportingClaimIds": [
        "clm-cleanliness-saves-lives"
      ]
    },
    {
      "id": "ev-semmelweis-publication",
      "movementId": "mov-handwashing-hygiene",
      "name": "Semmelweis Handwashing Publication",
      "description": "Release of Semmelweis's findings showing dramatic mortality reductions after chlorinated lime washing in Vienna's maternity clinic.",
      "recurrence": "once",
      "timingRule": "Published in the late 1840s and early 1850s with clinical data tables.",
      "notes": null,
      "tags": [
        "publication",
        "evidence"
      ],
      "mainPracticeIds": [
        "pr-handwashing-intervals"
      ],
      "mainEntityIds": [
        "ent-ignaz-semmelweis",
        "ent-handwashing-protocol"
      ],
      "readingTextIds": [
        "txt-semmelweis-lime-wash"
      ],
      "supportingClaimIds": [
        "clm-cleanliness-saves-lives"
      ]
    }
  ],
  "rules": [
    {
      "id": "rl-wash-before-and-between",
      "movementId": "mov-handwashing-hygiene",
      "description": "Wash hands thoroughly before entering wards and between any patient or instrument contact.",
      "kind": "must_do",
      "tags": [
        "hygiene",
        "duty"
      ],
      "supportingTextIds": [
        "txt-notes-on-nursing-handwashing",
        "txt-semmelweis-lime-wash"
      ],
      "supportingClaimIds": [
        "clm-handwashing-duty",
        "clm-cleanliness-saves-lives"
      ],
      "relatedPracticeIds": [
        "pr-handwashing-intervals"
      ],
      "sourcesOfTruth": [
        "nursing instruction"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "rl-keep-wards-clean",
      "movementId": "mov-handwashing-hygiene",
      "description": "Keep bedding, air, water, and surfaces clean and inspected, treating sanitation as constant preventive care.",
      "kind": "should_do",
      "tags": [
        "environment",
        "prevention"
      ],
      "supportingTextIds": [
        "txt-nightingale-polar-diagram"
      ],
      "supportingClaimIds": [
        "clm-cleanliness-saves-lives"
      ],
      "relatedPracticeIds": [
        "pr-sanitation-rounds",
        "pr-hygiene-ledger"
      ],
      "sourcesOfTruth": [
        "hospital design notes"
      ],
      "sourceEntityIds": [],
      "notes": null
    }
  ],
  "claims": [
    {
      "id": "clm-cleanliness-saves-lives",
      "movementId": "mov-handwashing-hygiene",
      "text": "Clean hands and sanitary wards dramatically cut infection and mortality in hospitals.",
      "category": "health",
      "tags": [
        "evidence",
        "prevention"
      ],
      "sourceTextIds": [
        "txt-semmelweis-lime-wash",
        "txt-nightingale-polar-diagram"
      ],
      "aboutEntityIds": [
        "ent-handwashing-protocol",
        "ent-sanitary-commission"
      ],
      "sourcesOfTruth": [
        "mortality statistics"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-handwashing-duty",
      "movementId": "mov-handwashing-hygiene",
      "text": "Regular handwashing is a professional obligation for caregivers, not an optional courtesy.",
      "category": "ethics",
      "tags": [
        "duty",
        "practice"
      ],
      "sourceTextIds": [
        "txt-notes-on-nursing-handwashing"
      ],
      "aboutEntityIds": [
        "ent-handwashing-protocol"
      ],
      "sourcesOfTruth": [
        "nursing education"
      ],
      "sourceEntityIds": [],
      "notes": null
    }
  ],
  "media": [
    {
      "id": "med-nightingale-polar-diagram",
      "movementId": "mov-handwashing-hygiene",
      "kind": "image",
      "uri": "https://upload.wikimedia.org/wikipedia/commons/1/17/Nightingale-mortality.jpg",
      "title": "Nightingale Polar Area Diagram",
      "description": "Visualization showing deaths from disease versus wounds in the Crimean War, used to argue for sanitation reforms.",
      "tags": [
        "data_viz",
        "sanitation"
      ],
      "linkedEntityIds": [
        "ent-polar-area-diagram",
        "ent-florence-nightingale"
      ],
      "linkedPracticeIds": [
        "pr-hygiene-ledger"
      ],
      "linkedEventIds": [
        "ev-scutari-reforms-1854"
      ],
      "linkedTextIds": [
        "txt-nightingale-polar-diagram"
      ]
    }
  ],
  "notes": [
    {
      "id": "note-mov-handwashing-overview",
      "movementId": "mov-handwashing-hygiene",
      "targetType": "Movement",
      "targetId": "mov-handwashing-hygiene",
      "author": "system",
      "body": "This dataset frames the 19th-century campaign for hospital hygiene and handwashing as a movement that combined evidence, infrastructure, and professional training.",
      "context": "designer",
      "tags": [
        "meta",
        "example"
      ]
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
