(function registerMovementDataset() {
const dataset = {
  "version": "3.4",
  "movements": [
    {
      "id": "mov-me-too",
      "name": "Me Too Movement",
      "shortName": "Me Too",
      "summary": "A global movement against sexual violence that amplifies survivors' stories, demands accountability, and shifts cultures toward consent and safety.",
      "notes": null,
      "tags": [
        "justice",
        "survivors",
        "consent"
      ]
    }
  ],
  "textCollections": [
    {
      "id": "tc-metoo-core-voices",
      "movementId": "mov-me-too",
      "name": "Core Statements",
      "description": "Foundational statements and calls to action that define the movement's purpose and tone.",
      "tags": [
        "statement",
        "call_to_action"
      ],
      "rootTextIds": [
        "txt-tarana-burke-origin",
        "txt-metoo-viral-post"
      ]
    }
  ],
  "texts": [
    {
      "id": "txt-tarana-burke-origin",
      "movementId": "mov-me-too",
      "parentId": null,
      "level": "work",
      "title": "Tarana Burke: Me Too is for Survivor Solidarity",
      "label": "Origin Statement",
      "content": "Tarana Burke frames Me Too as an invitation for survivors, especially Black girls, to find empathy and healing together rather than stand alone.",
      "mainFunction": "teaching",
      "tags": [
        "solidarity",
        "origin"
      ],
      "mentionsEntityIds": [
        "ent-tarana-burke",
        "ent-metoo-phrase"
      ]
    },
    {
      "id": "txt-metoo-viral-post",
      "movementId": "mov-me-too",
      "parentId": null,
      "level": "work",
      "title": "2017 Viral Hashtag Call",
      "label": "Viral Call",
      "content": "A social media post inviting people who experienced sexual harassment or assault to reply with 'me too', triggering a global wave of disclosures and solidarity.",
      "mainFunction": "call_to_action",
      "tags": [
        "hashtag",
        "social_media"
      ],
      "mentionsEntityIds": [
        "ent-metoo-phrase",
        "ent-survivor-stories"
      ]
    }
  ],
  "entities": [
    {
      "id": "ent-tarana-burke",
      "movementId": "mov-me-too",
      "name": "Tarana Burke",
      "kind": "being",
      "summary": "Founder of the Me Too movement who centered survivor-led healing and community care.",
      "notes": null,
      "tags": [
        "founder",
        "organizer"
      ],
      "sourcesOfTruth": [
        "interviews",
        "movement histories"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-metoo-phrase",
      "movementId": "mov-me-too",
      "name": "#MeToo Phrase",
      "kind": "idea",
      "summary": "A phrase and hashtag used to express shared experience with sexual violence and call for collective accountability.",
      "notes": null,
      "tags": [
        "hashtag",
        "symbol"
      ],
      "sourcesOfTruth": [
        "media coverage"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-survivor-stories",
      "movementId": "mov-me-too",
      "name": "Survivor Stories",
      "kind": "idea",
      "summary": "Personal testimonies about harassment, assault, and the demand for safety and justice.",
      "notes": null,
      "tags": [
        "testimony",
        "healing"
      ],
      "sourcesOfTruth": [
        "first-person accounts"
      ],
      "sourceEntityIds": []
    }
  ],
  "practices": [
    {
      "id": "pr-story-sharing",
      "movementId": "mov-me-too",
      "name": "Story Sharing",
      "kind": "service",
      "description": "Creating space online and offline for survivors to share experiences, be believed, and receive support without pressure to name perpetrators.",
      "frequency": "other",
      "isPublic": true,
      "notes": null,
      "tags": [
        "community_care",
        "healing"
      ],
      "involvedEntityIds": [
        "ent-survivor-stories",
        "ent-tarana-burke"
      ],
      "instructionsTextIds": [
        "txt-tarana-burke-origin"
      ],
      "supportingClaimIds": [
        "clm-believe-survivors"
      ],
      "sourcesOfTruth": [
        "movement guides"
      ],
      "sourceEntityIds": []
    }
  ],
  "events": [
    {
      "id": "ev-hashtag-2017",
      "movementId": "mov-me-too",
      "name": "2017 #MeToo Viral Surge",
      "description": "The period when the #MeToo hashtag surged globally, with millions sharing stories and prompting institutional responses.",
      "recurrence": "once",
      "timingRule": "October 2017 across social media platforms.",
      "notes": null,
      "tags": [
        "viral",
        "awareness"
      ],
      "mainPracticeIds": [
        "pr-story-sharing"
      ],
      "mainEntityIds": [
        "ent-metoo-phrase",
        "ent-survivor-stories"
      ],
      "readingTextIds": [
        "txt-metoo-viral-post"
      ],
      "supportingClaimIds": [
        "clm-believe-survivors"
      ]
    }
  ],
  "rules": [
    {
      "id": "rl-believe-support",
      "movementId": "mov-me-too",
      "description": "Believe survivors by default, offer support without demanding evidence, and prioritize their safety when acting.",
      "kind": "should_do",
      "tags": [
        "care",
        "ethics"
      ],
      "supportingTextIds": [
        "txt-tarana-burke-origin"
      ],
      "supportingClaimIds": [
        "clm-believe-survivors"
      ],
      "relatedPracticeIds": [
        "pr-story-sharing"
      ],
      "sourcesOfTruth": [
        "survivor advocacy principles"
      ],
      "sourceEntityIds": [],
      "notes": null
    }
  ],
  "claims": [
    {
      "id": "clm-believe-survivors",
      "movementId": "mov-me-too",
      "text": "Survivors of harassment and assault deserve to be believed, supported, and free from retaliation.",
      "category": "justice",
      "tags": [
        "safety",
        "accountability"
      ],
      "sourceTextIds": [
        "txt-tarana-burke-origin",
        "txt-metoo-viral-post"
      ],
      "aboutEntityIds": [
        "ent-survivor-stories"
      ],
      "sourcesOfTruth": [
        "survivor testimony",
        "advocacy statements"
      ],
      "sourceEntityIds": [],
      "notes": null
    }
  ],
  "media": [
    {
      "id": "med-metoo-hashtag",
      "movementId": "mov-me-too",
      "kind": "image",
      "uri": "https://example.com/images/metoo-hashtag.png",
      "title": "#MeToo Hashtag Banner",
      "description": "A banner used in online and offline actions to show solidarity with survivors.",
      "tags": [
        "hashtag",
        "solidarity"
      ],
      "linkedEntityIds": [
        "ent-metoo-phrase"
      ],
      "linkedPracticeIds": [
        "pr-story-sharing"
      ],
      "linkedEventIds": [
        "ev-hashtag-2017"
      ],
      "linkedTextIds": []
    }
  ],
  "notes": [
    {
      "id": "note-mov-metoo-overview",
      "movementId": "mov-me-too",
      "targetType": "Movement",
      "targetId": "mov-me-too",
      "author": "system",
      "body": "Sample data showing how contemporary, survivor-led movements can be modeled alongside historical and religious datasets.",
      "context": "designer",
      "tags": [
        "meta",
        "example"
      ]
    }
  ],
  "relations": [
    {
      "id": "rel-stories-amplify-change",
      "movementId": "mov-me-too",
      "fromEntityId": "ent-survivor-stories",
      "toEntityId": "ent-metoo-phrase",
      "relationType": "amplified_by",
      "tags": [
        "awareness"
      ],
      "supportingClaimIds": [
        "clm-believe-survivors"
      ],
      "sourcesOfTruth": [
        "media coverage"
      ],
      "sourceEntityIds": [],
      "notes": "The hashtag created a channel for stories to be seen and counted together."
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
