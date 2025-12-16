(function () {
  const dataset = {
    version: '3.4',

    movements: [
      {
        id: 'mov-reknit-december-15',
        name: 'Reknit',
        shortName: 'Reknit',
        summary:
          'Reknit is an open-source tradition for reclaiming attention, agency, and community in the age of algorithmic systems. It offers chartered safeguards against coercion and drift, and practical rituals that people can adopt, adapt, or fork.',
        notes: null,
        tags: [
          'reknit',
          'open_source_tradition',
          'agency',
          'attention',
          'consent',
          'community',
          'anti_capture',
          'safeguards',
          'tech_ethics'
        ]
      }
    ],

    textCollections: [
      {
        id: 'tc-reknit-charter',
        movementId: 'mov-reknit-december-15',
        name: 'Charter and Safeguards',
        description:
          'The foundational “why/how” of Reknit: purpose, diagnosis, method, and explicit anti-capture safeguards.',
        tags: ['doc:charter', 'layer:why', 'layer:how', 'truthmode:policy', 'audience:public'],
        rootTextIds: ['txt-reknit-charter-root']
      },
      {
        id: 'tc-reknit-lexicon',
        movementId: 'mov-reknit-december-15',
        name: 'Lexicon',
        description:
          'Definitions and shared language for core Reknit concepts (e.g., Home and Horizon).',
        tags: ['doc:lexicon', 'layer:what', 'truthmode:reference', 'audience:public'],
        rootTextIds: ['txt-reknit-lexicon-root']
      },
      {
        id: 'tc-reknit-practice-guides',
        movementId: 'mov-reknit-december-15',
        name: 'Practice Guides',
        description:
          'Runnable instructions for the smallest viable set of Reknit practices.',
        tags: ['doc:guide', 'layer:how', 'truthmode:instruction', 'audience:participant'],
        rootTextIds: ['txt-reknit-practices-root']
      }
    ],

    texts: [
      // =========================
      // Charter (WHY / HOW)
      // =========================
      {
        id: 'txt-reknit-charter-root',
        movementId: 'mov-reknit-december-15',
        parentId: null,
        level: 'work',
        title: 'The Reknit Charter',
        label: 'Charter',
        content: null,
        mainFunction: 'teaching',
        tags: [
          'doc:charter',
          'layer:why',
          'truthmode:policy',
          'audience:public',
          'power_surface',
          'hazard:authority',
          'hazard:coercion',
          'hazard:privacy',
          'hazard:relationships',
          'hazard:money'
        ],
        mentionsEntityIds: [
          'ent-reknit',
          'ent-home',
          'ent-horizon',
          'ent-attention',
          'ent-agency',
          'ent-consent',
          'ent-dignity',
          'ent-community',
          'ent-technology-systems',
          'ent-extractive-incentives',
          'ent-privacy',
          'ent-forking'
        ]
      },
      {
        id: 'txt-reknit-purpose',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-charter-root',
        level: 'passage',
        title: 'Purpose',
        label: 'Purpose',
        content: `Reknit exists to help people reclaim attention, agency, and belonging in an age of systems that profit from distraction, surveillance, and division.

We do this by rebuilding the human substrate: relationships, consent, reflection, and shared responsibility.

Reknit is a toolkit-tradition. Take what helps. Leave what doesn’t. If a practice harms you, pressures you, or narrows your life, it is not required—and it may be a signal that something needs repair.`,
        mainFunction: 'teaching',
        tags: ['layer:why', 'truthmode:teaching', 'audience:public'],
        mentionsEntityIds: [
          'ent-reknit',
          'ent-attention',
          'ent-agency',
          'ent-community',
          'ent-consent',
          'ent-dignity'
        ]
      },
      {
        id: 'txt-reknit-problem',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-charter-root',
        level: 'passage',
        title: 'The Problem We Are Solving',
        label: 'Problem Statement',
        content: `A growing share of modern life is mediated by systems whose incentives are not aligned with human flourishing.

Some platforms and institutions are optimized to extract attention, data, money, and conformity. They reward compulsive engagement, amplify outrage, and shape perception at scale. Over time, this can erode agency, degrade trust, and weaken community—especially when people are tired, isolated, or economically squeezed.

Reknit names this plainly without asking you to hate yourself, hate technology, or worship a new purity. The goal is not to “quit the world.” The goal is to live in the world with clearer consent, stronger boundaries, and more honest connection.`,
        mainFunction: 'commentary',
        tags: ['layer:why', 'truthmode:analysis', 'audience:public', 'threat_model'],
        mentionsEntityIds: [
          'ent-technology-systems',
          'ent-extractive-incentives',
          'ent-attention',
          'ent-agency',
          'ent-community',
          'ent-privacy',
          'ent-dignity'
        ]
      },
      {
        id: 'txt-reknit-method',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-charter-root',
        level: 'passage',
        title: 'Why a Tradition',
        label: 'Method',
        content: `We choose a tradition (not just a manifesto) because humans change through rhythm, practice, and belonging—not only through information.

A tradition can hold:
• a shared vocabulary for what matters,
• small repeatable practices that make change livable,
• stories that carry insight without coercion,
• and guardrails that reduce drift toward manipulation.

Reknit is designed to be forkable. No single person needs to run it. Small groups can adapt it locally, publish their changes, and still stay interoperable through shared safeguards.`,
        mainFunction: 'teaching',
        tags: ['layer:how', 'truthmode:teaching', 'audience:public', 'forkable'],
        mentionsEntityIds: ['ent-reknit', 'ent-community', 'ent-forking', 'ent-consent']
      },
      {
        id: 'txt-reknit-home-horizon',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-charter-root',
        level: 'passage',
        title: 'Home and Horizon',
        label: 'Home & Horizon',
        content: `Home is the anchor: the body, the breath, the attention that returns; the values and relationships close enough to be cared for in real time.

Horizon is the direction: the future you are responsible to; the community you serve; the longer arc of meaning beyond today’s feed.

Without Home, Horizon becomes coercion—grand plans that grind people down.
Without Horizon, Home becomes isolation—comfort that forgets responsibility.

Reknit is a practice of weaving Home and Horizon together: steady enough to resist manipulation, open enough to keep growing.`,
        mainFunction: 'teaching',
        tags: ['layer:what', 'truthmode:teaching', 'audience:public', 'core_concept'],
        mentionsEntityIds: ['ent-home', 'ent-horizon', 'ent-attention', 'ent-agency', 'ent-community']
      },
      {
        id: 'txt-reknit-stories-metaphor',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-charter-root',
        level: 'passage',
        title: 'On Stories, Symbols, and Interpretation',
        label: 'Stories Are Tools',
        content: `Reknit may use stories, symbols, names, and rituals. These are not loyalty tests.

Stories are tools for attention: they help humans remember, rehearse, and transmit meaning.
Symbols are handles: they help us carry what would otherwise be too complex.
Rituals are scaffolding: they help the body do what the mind already knows.

If any story is used to demand obedience, isolate you, control your relationships, or silence your critique, it is being misused—and that misuse is a violation of Reknit’s safeguards.`,
        mainFunction: 'commentary',
        tags: [
          'layer:how',
          'truthmode:teaching',
          'audience:public',
          'anti_literalism',
          'power_surface',
          'hazard:authority',
          'hazard:coercion',
          'hazard:relationships'
        ],
        mentionsEntityIds: ['ent-attention', 'ent-agency', 'ent-community', 'ent-consent', 'ent-dignity']
      },
      {
        id: 'txt-reknit-safeguards',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-charter-root',
        level: 'passage',
        title: 'Safeguards Against Coercion and Drift',
        label: 'Safeguards',
        content: `Reknit is intentionally “high-cohesion-capable” and therefore “high-abuse-capable.”
We do not pretend otherwise. We design for it.

Non‑negotiable safeguards:
1) Exit is always available. Leaving is not betrayal.
2) No hero worship. Facilitation is not spiritual authority.
3) No secrecy as status. No “inner teachings” that grant rank.
4) No pay‑to‑belong. No required payments, dues, or donation pressure.
5) No required disclosure. You can pass; you can be private.
6) No exclusivity. Reknit cannot demand primary allegiance over family, friends, or other traditions.
7) Data minimization. Collect less; retain less; publish transparently when you must collect.

These safeguards are not vibes. They are explicit rules and practices that can be audited and forked.`,
        mainFunction: 'teaching',
        tags: [
          'layer:how',
          'truthmode:policy',
          'audience:public',
          'safeguards',
          'anti_capture',
          'power_surface',
          'hazard:authority',
          'hazard:coercion',
          'hazard:privacy',
          'hazard:relationships',
          'hazard:money'
        ],
        mentionsEntityIds: [
          'ent-consent',
          'ent-dignity',
          'ent-community',
          'ent-privacy',
          'ent-forking',
          'ent-steward',
          'ent-host',
          'ent-participant'
        ]
      },
      {
        id: 'txt-reknit-scope-boundaries',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-charter-root',
        level: 'passage',
        title: 'Scope and Boundaries',
        label: 'Scope',
        content: `Reknit is not a replacement for medical care, mental health care, legal counsel, or emergency support.

Reknit is not a political party. Participants will have diverse politics. The shared goal is agency and human dignity; methods should remain compatible with pluralism.

Reknit does not require belief in a single metaphysics. Participation is practice-forward: what matters is what helps you become freer, kinder, more capable, and more connected.`,
        mainFunction: 'commentary',
        tags: ['layer:why', 'truthmode:policy', 'audience:public', 'scope', 'boundaries', 'pluralism'],
        mentionsEntityIds: ['ent-reknit', 'ent-agency', 'ent-dignity', 'ent-community']
      },

      // =========================
      // Lexicon (shared language)
      // =========================
      {
        id: 'txt-reknit-lexicon-root',
        movementId: 'mov-reknit-december-15',
        parentId: null,
        level: 'work',
        title: 'Reknit Lexicon',
        label: 'Lexicon',
        content: null,
        mainFunction: 'commentary',
        tags: ['doc:lexicon', 'layer:what', 'truthmode:reference', 'audience:public'],
        mentionsEntityIds: [
          'ent-home',
          'ent-horizon',
          'ent-attention',
          'ent-agency',
          'ent-consent',
          'ent-reknitter-demonym'
        ]
      },
      {
        id: 'txt-reknit-lexicon-home',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-lexicon-root',
        level: 'passage',
        title: 'Home',
        label: 'Definition: Home',
        content: `Home is the inner anchor: the place your attention can return without permission from a device, a platform, or a crowd.

Home includes the body, the breath, the immediate relationships you can actually care for, and the values you are willing to live by when nobody is watching.`,
        mainFunction: 'commentary',
        tags: ['layer:what', 'truthmode:reference', 'audience:public', 'lexicon:definition', 'home'],
        mentionsEntityIds: ['ent-home', 'ent-attention', 'ent-agency']
      },
      {
        id: 'txt-reknit-lexicon-horizon',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-lexicon-root',
        level: 'passage',
        title: 'Horizon',
        label: 'Definition: Horizon',
        content: `Horizon is the outward direction: the longer arc of responsibility beyond immediate comfort.

Horizon includes commitments, service, community repair, and the future you want to hand to others.`,
        mainFunction: 'commentary',
        tags: ['layer:what', 'truthmode:reference', 'audience:public', 'lexicon:definition', 'horizon'],
        mentionsEntityIds: ['ent-horizon', 'ent-community', 'ent-dignity']
      },
      {
        id: 'txt-reknit-lexicon-attention',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-lexicon-root',
        level: 'passage',
        title: 'Attention',
        label: 'Definition: Attention',
        content: `Attention is the steering wheel of a life. What repeatedly takes your attention will shape what you become.

Reknit treats attention as finite, trainable, and worth defending.`,
        mainFunction: 'commentary',
        tags: ['layer:what', 'truthmode:reference', 'audience:public', 'lexicon:definition', 'attention'],
        mentionsEntityIds: ['ent-attention', 'ent-agency']
      },
      {
        id: 'txt-reknit-lexicon-agency',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-lexicon-root',
        level: 'passage',
        title: 'Agency',
        label: 'Definition: Agency',
        content: `Agency is your capacity to choose, to act, and to revise your choices with honesty.

Reknit treats agency as something communities can strengthen together—not something you must “bootstrap” alone.`,
        mainFunction: 'commentary',
        tags: ['layer:what', 'truthmode:reference', 'audience:public', 'lexicon:definition', 'agency'],
        mentionsEntityIds: ['ent-agency', 'ent-community', 'ent-consent']
      },
      {
        id: 'txt-reknit-lexicon-consent',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-lexicon-root',
        level: 'passage',
        title: 'Consent',
        label: 'Definition: Consent',
        content: `Consent is informed, reversible permission—given without coercion.

In Reknit, consent includes: consent to participate, consent to be contacted, consent to share, and consent to change your mind.`,
        mainFunction: 'commentary',
        tags: ['layer:what', 'truthmode:reference', 'audience:public', 'lexicon:definition', 'consent'],
        mentionsEntityIds: ['ent-consent', 'ent-dignity', 'ent-privacy']
      },
      {
        id: 'txt-reknit-lexicon-reknitter',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-lexicon-root',
        level: 'passage',
        title: 'Reknitter (optional demonym)',
        label: 'Definition: Reknitter',
        content: `“Reknitter” is an optional word for a person who practices Reknit.

It is not a badge. It is not a rank. Nobody owes you this label, and you do not owe it to anyone.`,
        mainFunction: 'commentary',
        tags: [
          'layer:what',
          'truthmode:reference',
          'audience:public',
          'lexicon:demonym',
          'identity_language',
          'power_surface',
          'hazard:identity',
          'hazard:relationships'
        ],
        mentionsEntityIds: ['ent-reknitter-demonym', 'ent-participant', 'ent-dignity']
      },

      // =========================
      // Practice Guides (runnable)
      // =========================
      {
        id: 'txt-reknit-practices-root',
        movementId: 'mov-reknit-december-15',
        parentId: null,
        level: 'work',
        title: 'Reknit Practice Guides',
        label: 'Practice Guides',
        content: null,
        mainFunction: 'instructions',
        tags: ['doc:guide', 'layer:how', 'truthmode:instruction', 'audience:participant'],
        mentionsEntityIds: ['ent-attention', 'ent-agency', 'ent-consent', 'ent-community']
      },
      {
        id: 'txt-reknit-practice-weekly-reweave',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-practices-root',
        level: 'passage',
        title: 'Practice: Weekly Reweave',
        label: 'Weekly Reweave',
        content: `Duration: 10–20 minutes. Frequency: weekly. Privacy: solo.

1) Return to Home (2 minutes)
   • Put the phone face down or out of reach.
   • Take three slow breaths.
   • Ask: “What has been taking my attention this week?”

2) Name the pull (3 minutes)
   • Write 3 bullet points: what pulled you, what it gave you, what it cost you.

3) Choose one boundary (5 minutes)
   • Pick one small change for the next 7 days.
     Examples: remove one app from the home screen; disable one notification category; set a “no phone in bed” rule; create one offline hour.

4) Choose one stitch (5 minutes)
   • Do one action that strengthens Horizon.
     Examples: message a friend to repair a thread; schedule a walk; help someone with a privacy setting; cook for someone; contribute to a local project.

5) Permission (1 minute)
   • If you miss a week, you’re not failing. You’re noticing.
   • If any step increases shame or panic, simplify it or stop.`,
        mainFunction: 'instructions',
        tags: ['layer:how', 'truthmode:instruction', 'audience:participant', 'practice', 'discipline', 'home', 'horizon'],
        mentionsEntityIds: ['ent-home', 'ent-horizon', 'ent-attention', 'ent-agency']
      },
      {
        id: 'txt-reknit-practice-circle',
        movementId: 'mov-reknit-december-15',
        parentId: 'txt-reknit-practices-root',
        level: 'passage',
        title: 'Practice: Reknit Circle',
        label: 'Reknit Circle',
        content: `Duration: 60–90 minutes. Frequency: monthly (or weekly). Privacy: group.

Purpose: A Reknit Circle is a structured meeting that strengthens connection without coercion.

Structure:
1) Opening safeguards (2 minutes)
   • Read aloud: “Anyone can leave at any time. Passing is allowed. No one owes disclosure.”
   • Name that facilitation is logistics, not authority.

2) Check-in round (20–30 minutes)
   • Each person: 1–3 minutes. Prompt: “What strengthened Home? What strengthened Horizon?”
   • Passing is always honored, without explanation.

3) Short reading (5 minutes)
   • Read a short passage from the Charter or Lexicon.

4) Skill-share / mutual support (20–30 minutes)
   • Practical help only. No diagnosing. No fixing someone’s soul.
   • If advice is offered, it is offered as optional.

5) Closing (2 minutes)
   • Each person names one stitch they intend to make before the next circle.

Built-in anti-cult controls:
• Rotate facilitator each meeting (or use random selection).
• No money handling during circle.
• No secret “advanced” circles.
• No attendance tracking used for status.`,
        mainFunction: 'instructions',
        tags: [
          'layer:how',
          'truthmode:ritual',
          'audience:facilitator',
          'practice',
          'gathering',
          'power_surface',
          'anti_capture',
          'hazard:authority',
          'hazard:coercion',
          'hazard:relationships',
          'hazard:privacy',
          'hazard:money',
          'hazard:secrecy'
        ],
        mentionsEntityIds: [
          'ent-community',
          'ent-consent',
          'ent-dignity',
          'ent-host',
          'ent-participant',
          'ent-agency',
          'ent-home',
          'ent-horizon'
        ]
      }
    ],

    entities: [
      {
        id: 'ent-reknit',
        movementId: 'mov-reknit-december-15',
        name: 'Reknit (the tradition)',
        kind: 'idea',
        summary:
          'An open-source tradition for reclaiming attention and agency and rebuilding community, with explicit safeguards against coercion and organizational drift.',
        notes: null,
        tags: ['tradition', 'open_source', 'safeguards'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-home',
        movementId: 'mov-reknit-december-15',
        name: 'Home',
        kind: 'idea',
        summary:
          'The inner anchor: attention returning, the body, immediate relationships, and lived values.',
        notes: null,
        tags: ['home', 'anchor'],
        sourcesOfTruth: ['Reknit Lexicon'],
        sourceEntityIds: []
      },
      {
        id: 'ent-horizon',
        movementId: 'mov-reknit-december-15',
        name: 'Horizon',
        kind: 'idea',
        summary:
          'The outward direction: responsibility, service, and the longer arc of meaning and community repair.',
        notes: null,
        tags: ['horizon', 'direction'],
        sourcesOfTruth: ['Reknit Lexicon'],
        sourceEntityIds: []
      },
      {
        id: 'ent-attention',
        movementId: 'mov-reknit-december-15',
        name: 'Attention',
        kind: 'idea',
        summary:
          'The finite, trainable capacity that steers a life; a primary target of extractive systems.',
        notes: null,
        tags: ['attention', 'focus'],
        sourcesOfTruth: ['Reknit Lexicon'],
        sourceEntityIds: []
      },
      {
        id: 'ent-agency',
        movementId: 'mov-reknit-december-15',
        name: 'Agency',
        kind: 'idea',
        summary:
          'The capacity to choose and act with honesty; strengthened by boundaries, community, and consent.',
        notes: null,
        tags: ['agency', 'autonomy'],
        sourcesOfTruth: ['Reknit Lexicon'],
        sourceEntityIds: []
      },
      {
        id: 'ent-consent',
        movementId: 'mov-reknit-december-15',
        name: 'Consent',
        kind: 'idea',
        summary:
          'Informed, reversible permission given without coercion; a non-negotiable norm for Reknit practice.',
        notes: null,
        tags: ['consent', 'noncoercion'],
        sourcesOfTruth: ['Reknit Charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-dignity',
        movementId: 'mov-reknit-december-15',
        name: 'Dignity',
        kind: 'idea',
        summary:
          'The inherent worth of persons; must not be traded for belonging, status, or compliance.',
        notes: null,
        tags: ['dignity', 'ethics'],
        sourcesOfTruth: ['Reknit Charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-community',
        movementId: 'mov-reknit-december-15',
        name: 'Community',
        kind: 'idea',
        summary:
          'A network of mutual care and responsibility that strengthens agency and repair.',
        notes: null,
        tags: ['community', 'mutual_aid'],
        sourcesOfTruth: ['Reknit Charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-technology-systems',
        movementId: 'mov-reknit-december-15',
        name: 'Algorithmic Systems',
        kind: 'idea',
        summary:
          'Large-scale software-mediated systems that shape attention and behavior through incentives, ranking, and feedback loops.',
        notes: null,
        tags: ['technology', 'algorithms', 'systems'],
        sourcesOfTruth: ['Reknit Charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-extractive-incentives',
        movementId: 'mov-reknit-december-15',
        name: 'Extractive Incentives',
        kind: 'idea',
        summary:
          'Incentives that optimize for attention, data, money, or control at the expense of human flourishing.',
        notes: null,
        tags: ['incentives', 'extraction'],
        sourcesOfTruth: ['Reknit Charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-privacy',
        movementId: 'mov-reknit-december-15',
        name: 'Privacy',
        kind: 'idea',
        summary:
          'The right and ability to control personal information and boundaries; protected via minimization and consent.',
        notes: null,
        tags: ['privacy', 'data_minimization'],
        sourcesOfTruth: ['Reknit Charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-participant',
        movementId: 'mov-reknit-december-15',
        name: 'Participant',
        kind: 'idea',
        summary:
          'A person engaging in Reknit practices. Participation is voluntary; leaving is always allowed.',
        notes: null,
        tags: ['role', 'participant'],
        sourcesOfTruth: ['Reknit Safeguards'],
        sourceEntityIds: []
      },
      {
        id: 'ent-host',
        movementId: 'mov-reknit-december-15',
        name: 'Host (facilitator)',
        kind: 'idea',
        summary:
          'A logistics and safety role for gatherings. Hosting is not authority and must rotate or be replaceable.',
        notes: null,
        tags: ['role', 'host', 'facilitator', 'power_surface'],
        sourcesOfTruth: ['Reknit Practice Guides'],
        sourceEntityIds: []
      },
      {
        id: 'ent-steward',
        movementId: 'mov-reknit-december-15',
        name: 'Steward',
        kind: 'idea',
        summary:
          'A maintainer role for shared artifacts (texts, datasets, tooling). Stewards are constrained by safeguards and transparency.',
        notes: null,
        tags: ['role', 'steward', 'governance', 'power_surface'],
        sourcesOfTruth: ['Reknit Charter'],
        sourceEntityIds: []
      },
      {
        id: 'ent-reknitter-demonym',
        movementId: 'mov-reknit-december-15',
        name: '“Reknitter” (demonym)',
        kind: 'idea',
        summary:
          'An optional identity label for people who practice Reknit; not a badge, rank, or loyalty marker.',
        notes: null,
        tags: ['demonym', 'identity_language', 'power_surface'],
        sourcesOfTruth: ['Reknit Lexicon'],
        sourceEntityIds: []
      },
      {
        id: 'ent-forking',
        movementId: 'mov-reknit-december-15',
        name: 'Forking',
        kind: 'idea',
        summary:
          'The right and practice of copying, adapting, and publishing alternative versions of Reknit artifacts without needing permission.',
        notes: null,
        tags: ['forking', 'open_source', 'pluralism'],
        sourcesOfTruth: ['Reknit Charter'],
        sourceEntityIds: []
      }
    ],

    claims: [
      {
        id: 'clm-reknit-purpose',
        movementId: 'mov-reknit-december-15',
        text:
          'Reknit exists to help people reclaim attention, agency, and belonging in the age of extractive systems.',
        category: 'purpose',
        tags: ['core', 'why'],
        sourceTextIds: ['txt-reknit-purpose', 'txt-reknit-problem'],
        aboutEntityIds: ['ent-reknit', 'ent-attention', 'ent-agency', 'ent-community'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'clm-attention-is-finite',
        movementId: 'mov-reknit-december-15',
        text: 'Attention is finite, trainable, and worth defending.',
        category: 'anthropology',
        tags: ['attention', 'core'],
        sourceTextIds: ['txt-reknit-lexicon-attention', 'txt-reknit-problem'],
        aboutEntityIds: ['ent-attention', 'ent-agency'],
        sourcesOfTruth: ['Reknit Lexicon'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'clm-practices-optional',
        movementId: 'mov-reknit-december-15',
        text:
          'Practices are tools: if something isn’t helping you, you can set it aside without shame.',
        category: 'ethos',
        tags: ['permission', 'noncoercion'],
        sourceTextIds: ['txt-reknit-purpose'],
        aboutEntityIds: ['ent-agency', 'ent-dignity'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'clm-stories-are-tools',
        movementId: 'mov-reknit-december-15',
        text:
          'Stories and symbols are tools for meaning, not loyalty tests; they must not be used to demand obedience or silence critique.',
        category: 'interpretation',
        tags: ['anti_capture', 'anti_literalism'],
        sourceTextIds: ['txt-reknit-stories-metaphor'],
        aboutEntityIds: ['ent-agency', 'ent-community', 'ent-dignity'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'clm-consent-and-dignity',
        movementId: 'mov-reknit-december-15',
        text: 'Consent and dignity are non-negotiable in Reknit practice and governance.',
        category: 'ethics',
        tags: ['consent', 'dignity', 'core'],
        sourceTextIds: ['txt-reknit-safeguards', 'txt-reknit-lexicon-consent'],
        aboutEntityIds: ['ent-consent', 'ent-dignity'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'clm-forking-is-allowed',
        movementId: 'mov-reknit-december-15',
        text:
          'Forking is a feature: anyone can copy and adapt Reknit artifacts without asking permission.',
        category: 'governance',
        tags: ['forking', 'pluralism', 'anti_capture'],
        sourceTextIds: ['txt-reknit-method', 'txt-reknit-safeguards'],
        aboutEntityIds: ['ent-forking', 'ent-reknit'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'clm-critique-is-care',
        movementId: 'mov-reknit-december-15',
        text:
          'Good-faith critique is a form of care; disagreement is allowed and must not be treated as disloyalty.',
        category: 'community',
        tags: ['critique', 'pluralism'],
        sourceTextIds: ['txt-reknit-scope-boundaries', 'txt-reknit-safeguards'],
        aboutEntityIds: ['ent-community', 'ent-dignity'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      }
    ],

    rules: [
      {
        id: 'rl-exit-rights',
        movementId: 'mov-reknit-december-15',
        shortText: 'Anyone can leave at any time; exit is always available.',
        kind: 'must_do',
        details:
          'Participation is voluntary. No permission is required to stop attending, stop practicing, or stop identifying with Reknit.',
        appliesTo: ['All participants', 'All hosts', 'All stewards'],
        domain: ['safeguards', 'community'],
        tags: ['exit', 'anti_capture', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards'],
        supportingClaimIds: ['clm-consent-and-dignity', 'clm-practices-optional'],
        relatedPracticeIds: ['pr-reknit-circle', 'pr-weekly-reweave'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-no-retaliation',
        movementId: 'mov-reknit-december-15',
        shortText:
          'No retaliation: do not shame, punish, or pursue people for leaving or criticizing.',
        kind: 'must_not_do',
        details:
          'No shunning campaigns, harassment, “loyalty tests,” or social punishment for exit or dissent. If conflict exists, treat it with dignity and boundaries.',
        appliesTo: ['All participants', 'All hosts', 'All stewards'],
        domain: ['safeguards', 'community'],
        tags: ['exit', 'anti_capture', 'noncoercion', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards', 'txt-reknit-stories-metaphor'],
        supportingClaimIds: ['clm-critique-is-care', 'clm-consent-and-dignity'],
        relatedPracticeIds: ['pr-reknit-circle'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-no-hero-worship',
        movementId: 'mov-reknit-december-15',
        shortText: 'No hero worship: facilitation is not spiritual authority.',
        kind: 'must_not_do',
        details:
          'Do not treat any person as infallible, uniquely chosen, or beyond critique. Do not build status ladders around proximity to founders, hosts, or stewards.',
        appliesTo: ['All participants', 'All hosts', 'All stewards'],
        domain: ['safeguards', 'governance'],
        tags: ['authority', 'anti_capture', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards'],
        supportingClaimIds: ['clm-critique-is-care'],
        relatedPracticeIds: ['pr-reknit-circle'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-no-secret-teachings',
        movementId: 'mov-reknit-december-15',
        shortText: 'No secrecy as status: no inner teachings that grant rank.',
        kind: 'must_not_do',
        details:
          'Do not create hidden tiers, “advanced” private doctrines, or privileged access that confers authority. Private support groups may exist for safety, but not for rank.',
        appliesTo: ['All hosts', 'All stewards'],
        domain: ['safeguards', 'governance'],
        tags: ['secrecy', 'information_control', 'anti_capture', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards'],
        supportingClaimIds: ['clm-forking-is-allowed'],
        relatedPracticeIds: ['pr-reknit-circle'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-no-exclusive-allegiance',
        movementId: 'mov-reknit-december-15',
        shortText:
          'No exclusivity: Reknit must not demand primary allegiance over relationships or other traditions.',
        kind: 'must_not_do',
        details:
          'No pressure to cut off family/friends, quit other communities, or treat Reknit as the only legitimate path. Isolation is a red flag.',
        appliesTo: ['All hosts', 'All stewards', 'All participants'],
        domain: ['safeguards', 'community'],
        tags: ['isolation', 'anti_capture', 'pluralism', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards', 'txt-reknit-scope-boundaries'],
        supportingClaimIds: ['clm-consent-and-dignity', 'clm-critique-is-care'],
        relatedPracticeIds: ['pr-reknit-circle'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-no-required-payments',
        movementId: 'mov-reknit-december-15',
        shortText: 'No pay-to-belong: no required dues, fees, or mandatory donations.',
        kind: 'must_not_do',
        details:
          'No practice, meeting, or status is contingent on payment. If money is ever collected for costs, publish what it is for and make free participation available.',
        appliesTo: ['All hosts', 'All stewards'],
        domain: ['safeguards', 'money'],
        tags: ['money', 'anti_capture', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards'],
        supportingClaimIds: ['clm-consent-and-dignity'],
        relatedPracticeIds: ['pr-reknit-circle'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-no-guilt-fundraising',
        movementId: 'mov-reknit-december-15',
        shortText: 'No guilt fundraising: do not pressure, shame, or “urgency-script” people into giving.',
        kind: 'must_not_do',
        details:
          'No donor status ladders. No public recognition tied to belonging. No “if you cared you’d give” language. Fundraising must not become a primary narrative.',
        appliesTo: ['All stewards', 'All hosts'],
        domain: ['money', 'safeguards'],
        tags: ['money', 'social_pressure', 'anti_capture', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards'],
        supportingClaimIds: ['clm-consent-and-dignity', 'clm-critique-is-care'],
        relatedPracticeIds: [],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-financial-transparency',
        movementId: 'mov-reknit-december-15',
        shortText: 'If money is handled, publish transparent accounting and decision rationale.',
        kind: 'must_do',
        details:
          'If a group collects funds, it must publish: what was collected, what it was spent on, who decided, and how conflicts of interest are handled. Prefer minimal collection.',
        appliesTo: ['Any stewarded group that handles funds'],
        domain: ['money', 'governance'],
        tags: ['money', 'transparency', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards'],
        supportingClaimIds: ['clm-forking-is-allowed'],
        relatedPracticeIds: [],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-data-minimization',
        movementId: 'mov-reknit-december-15',
        shortText: 'Data minimization: collect the least personal data possible; retain it briefly.',
        kind: 'should_do',
        details:
          'Avoid lists of members, attendance logs, or dossiers. If contact lists exist, obtain consent, allow easy removal, and limit retention.',
        appliesTo: ['All hosts', 'All stewards'],
        domain: ['privacy', 'safeguards'],
        tags: ['privacy', 'data_minimization', 'anti_capture', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards', 'txt-reknit-lexicon-consent'],
        supportingClaimIds: ['clm-consent-and-dignity'],
        relatedPracticeIds: ['pr-reknit-circle'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-no-required-disclosure',
        movementId: 'mov-reknit-december-15',
        shortText: 'No required disclosure: people may pass and keep private boundaries.',
        kind: 'must_not_do',
        details:
          'Do not require confessional sharing, personal history disclosure, or trauma disclosure. Passing is valid without explanation.',
        appliesTo: ['All hosts', 'All participants'],
        domain: ['privacy', 'safeguards'],
        tags: ['privacy', 'noncoercion', 'power_surface'],
        supportingTextIds: ['txt-reknit-safeguards', 'txt-reknit-practice-circle'],
        supportingClaimIds: ['clm-consent-and-dignity'],
        relatedPracticeIds: ['pr-reknit-circle'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-facilitation-rotation',
        movementId: 'mov-reknit-december-15',
        shortText: 'Rotate facilitation for gatherings; do not centralize authority in one host.',
        kind: 'should_do',
        details:
          'Rotation reduces charismatic capture and status fixation. If a stable host exists, there should be a clear replacement path and explicit limits.',
        appliesTo: ['Hosts of Reknit gatherings'],
        domain: ['governance', 'safeguards'],
        tags: ['authority', 'anti_capture', 'power_surface'],
        supportingTextIds: ['txt-reknit-practice-circle', 'txt-reknit-safeguards'],
        supportingClaimIds: ['clm-critique-is-care'],
        relatedPracticeIds: ['pr-reknit-circle'],
        sourcesOfTruth: ['Reknit Practice Guides'],
        sourceEntityIds: [],
        notes: null
      },
      {
        id: 'rl-public-critique-pathway',
        movementId: 'mov-reknit-december-15',
        shortText: 'Maintain a public pathway for critique and correction (documentation, not whispers).',
        kind: 'should_do',
        details:
          'Drift thrives in private channels. Prefer written, public issue-tracking and transparent decision logs for stewarded artifacts.',
        appliesTo: ['Stewards and hosts of shared artifacts'],
        domain: ['governance', 'safeguards'],
        tags: ['transparency', 'anti_capture', 'power_surface'],
        supportingTextIds: ['txt-reknit-method', 'txt-reknit-safeguards'],
        supportingClaimIds: ['clm-critique-is-care', 'clm-forking-is-allowed'],
        relatedPracticeIds: [],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: null
      }
    ],

    practices: [
      {
        id: 'pr-weekly-reweave',
        movementId: 'mov-reknit-december-15',
        name: 'Weekly Reweave',
        kind: 'discipline',
        description:
          'A short weekly solo ritual for auditing attention, choosing one boundary, and making one “stitch” toward Horizon.',
        frequency: 'weekly',
        isPublic: false,
        notes: 'Designed to be lightweight: it should not become a burden or loyalty test.',
        tags: ['discipline', 'home', 'horizon'],
        involvedEntityIds: ['ent-home', 'ent-horizon', 'ent-attention', 'ent-agency'],
        instructionsTextIds: ['txt-reknit-practice-weekly-reweave'],
        supportingClaimIds: ['clm-attention-is-finite', 'clm-practices-optional', 'clm-reknit-purpose'],
        sourcesOfTruth: ['Reknit Practice Guides'],
        sourceEntityIds: []
      },
      {
        id: 'pr-reknit-circle',
        movementId: 'mov-reknit-december-15',
        name: 'Reknit Circle',
        kind: 'ritual',
        description:
          'A structured group meeting that strengthens connection with explicit safeguards against coercion, disclosure pressure, and charismatic capture.',
        frequency: 'monthly',
        isPublic: true,
        notes:
          'This is a power surface. It must remain optional, replaceable, and transparent.',
        tags: ['gathering', 'power_surface', 'anti_capture'],
        involvedEntityIds: ['ent-community', 'ent-consent', 'ent-dignity', 'ent-host', 'ent-participant'],
        instructionsTextIds: ['txt-reknit-practice-circle'],
        supportingClaimIds: ['clm-consent-and-dignity', 'clm-critique-is-care', 'clm-practices-optional'],
        sourcesOfTruth: ['Reknit Practice Guides', 'The Reknit Charter'],
        sourceEntityIds: []
      }
    ],

    events: [
      {
        id: 'ev-weekly-reweave',
        movementId: 'mov-reknit-december-15',
        name: 'Weekly Reweave (personal)',
        description:
          'A weekly personal check-in and boundary reset to protect attention and restore agency.',
        recurrence: 'weekly',
        timingRule: 'Once per week, at a time chosen by the participant.',
        notes: 'Not tracked. Not audited. No attendance or streak culture.',
        tags: ['weekly', 'personal', 'home', 'horizon'],
        mainPracticeIds: ['pr-weekly-reweave'],
        mainEntityIds: ['ent-home', 'ent-horizon', 'ent-attention'],
        readingTextIds: ['txt-reknit-purpose', 'txt-reknit-lexicon-attention'],
        supportingClaimIds: ['clm-attention-is-finite', 'clm-practices-optional']
      },
      {
        id: 'ev-reknit-circle',
        movementId: 'mov-reknit-december-15',
        name: 'Reknit Circle (gathering)',
        description:
          'A recurring gathering for reflection, repair, and mutual support—explicitly constrained by anti-capture safeguards.',
        recurrence: 'monthly',
        timingRule: 'Once per month, locally scheduled. May be weekly for some groups.',
        notes: 'Keep it small, optional, and replaceable. Rotation preferred.',
        tags: ['monthly', 'gathering', 'power_surface'],
        mainPracticeIds: ['pr-reknit-circle'],
        mainEntityIds: ['ent-community', 'ent-consent', 'ent-dignity'],
        readingTextIds: ['txt-reknit-safeguards', 'txt-reknit-home-horizon'],
        supportingClaimIds: ['clm-consent-and-dignity', 'clm-critique-is-care']
      }
    ],

    media: [],

    notes: [
      {
        id: 'note-reknit-founder-scope',
        movementId: 'mov-reknit-december-15',
        targetType: 'Movement',
        targetId: 'mov-reknit-december-15',
        author: 'system',
        body: `Design intent: Reknit is meant to be publishable, forkable, and runnable without a central leader.

This dataset is a specification for a tradition. It is not a demand for allegiance. It is not a membership system.

If a future “center” forms, it must remain constrained by the safeguards in the Charter. If it cannot, the correct move is for communities to fork.`,
        context: 'designer',
        tags: ['meta', 'scope', 'anti_capture', 'forkable']
      },
      {
        id: 'note-reknit-risk-charter',
        movementId: 'mov-reknit-december-15',
        targetType: 'Text',
        targetId: 'txt-reknit-charter-root',
        author: 'system',
        body: `RISK ASSESSMENT (trailhead): Charter language can be weaponized as authority or used to overreach privacy.

Hazards to watch:
• charismatic capture (treating charter as personal mandate)
• scope creep into relationships or money handling
• privacy overreach in the name of “safeguards”

Mitigations (by ID):
• Exit + critique: rl-exit-rights, rl-no-retaliation
• Anti-authority and anti-secrecy: rl-no-hero-worship, rl-no-secret-teachings
• Data and money boundaries: rl-data-minimization, rl-no-required-payments, rl-financial-transparency
• Pluralism guardrail: rl-no-exclusive-allegiance`,
        context: 'risk_assessment',
        tags: [
          'risk',
          'power_surface',
          'hazard:authority',
          'hazard:coercion',
          'hazard:privacy',
          'hazard:relationships',
          'hazard:money',
          'mitigations-listed'
        ]
      },
      {
        id: 'note-reknit-risk-safeguards',
        movementId: 'mov-reknit-december-15',
        targetType: 'Text',
        targetId: 'txt-reknit-safeguards',
        author: 'system',
        body: `RISK ASSESSMENT (trailhead): Safeguards can drift into control or bureaucracy if enforced coercively.

Hazards:
• using safeguards to shame or gatekeep
• layering paperwork that discourages participation
• conflating facilitation with authority

Mitigations (by ID):
• No retaliation and exit rights: rl-no-retaliation, rl-exit-rights
• Authority dispersion: rl-facilitation-rotation, rl-no-hero-worship
• Privacy protection: rl-no-required-disclosure, rl-data-minimization
• Transparency on resources: rl-no-required-payments, rl-financial-transparency`,
        context: 'risk_assessment',
        tags: [
          'risk',
          'power_surface',
          'hazard:authority',
          'hazard:coercion',
          'hazard:relationships',
          'hazard:privacy',
          'hazard:money',
          'mitigations-listed'
        ]
      },
      {
        id: 'note-reknit-risk-stories',
        movementId: 'mov-reknit-december-15',
        targetType: 'Text',
        targetId: 'txt-reknit-stories-metaphor',
        author: 'system',
        body: `RISK ASSESSMENT (trailhead): Metaphors and symbols can be misused as loyalty tests or to override consent.

Hazards:
• treating symbolic language as literal authority
• using story cues to pressure disclosure or obedience
• scapegoating outsiders via metaphor

Mitigations (by ID):
• Interpretation guardrails: txt-reknit-stories-metaphor, clm-critique-is-care
• Anti-coercion rules: rl-no-retaliation, rl-no-secret-teachings
• Exit + pluralism protections: rl-exit-rights, rl-no-exclusive-allegiance`,
        context: 'risk_assessment',
        tags: [
          'risk',
          'power_surface',
          'hazard:authority',
          'hazard:coercion',
          'hazard:relationships',
          'mitigations-listed'
        ]
      },
      {
        id: 'note-reknit-risk-circle',
        movementId: 'mov-reknit-december-15',
        targetType: 'Practice',
        targetId: 'pr-reknit-circle',
        author: 'system',
        body: `RISK ASSESSMENT (trailhead): Reknit Circle is a high-leverage cohesion primitive.

Primary hazards:
• social pressure / loyalty signaling
• charismatic capture (host becomes authority)
• “confessional” disclosure drift
• secrecy as status (inner circle)
• isolation / exclusivity norms
• money handling inside gatherings

Mitigations (by ID):
• Exit + no retaliation: rl-exit-rights, rl-no-retaliation
• Anti-authority: rl-no-hero-worship, rl-facilitation-rotation
• Anti-secrecy: rl-no-secret-teachings
• Anti-disclosure pressure: rl-no-required-disclosure
• Anti-isolation: rl-no-exclusive-allegiance
• Money separation + transparency: rl-no-required-payments, rl-no-guilt-fundraising, rl-financial-transparency
• Documentation-based correction: rl-public-critique-pathway

Signals to watch:
• people apologizing for “missing meetings”
• hosts speaking as moral arbiters or gatekeepers
• attendance/status tracking
• escalating private “special” sessions
• donation talk inside circles

Review cadence suggestion: quarterly (as a note update).`,
        context: 'risk_assessment',
        tags: [
          'risk',
          'power_surface',
          'hazard:authority',
          'hazard:social_pressure',
          'hazard:secrecy',
          'hazard:privacy',
          'hazard:money',
          'mitigations-listed'
        ]
      },
      {
        id: 'note-reknit-risk-circle-text',
        movementId: 'mov-reknit-december-15',
        targetType: 'Text',
        targetId: 'txt-reknit-practice-circle',
        author: 'system',
        body: `RISK ASSESSMENT (trailhead): The Reknit Circle script is a cohesion engine and must not be turned into compulsory attendance or confession.

Hazards:
• hosts accruing unchecked authority
• social pressure to disclose or conform
• money handling inside the gathering

Mitigations (by ID):
• Authority rotation + anti-worship: rl-facilitation-rotation, rl-no-hero-worship
• Exit and privacy: rl-exit-rights, rl-no-required-disclosure, rl-data-minimization
• Money boundaries: rl-no-required-payments, rl-financial-transparency
• Anti-secrecy and pluralism: rl-no-secret-teachings, rl-no-exclusive-allegiance`,
        context: 'risk_assessment',
        tags: [
          'risk',
          'power_surface',
          'hazard:authority',
          'hazard:coercion',
          'hazard:relationships',
          'hazard:privacy',
          'hazard:money',
          'hazard:secrecy',
          'mitigations-listed'
        ]
      },
      {
        id: 'note-reknit-risk-demonym-text',
        movementId: 'mov-reknit-december-15',
        targetType: 'Text',
        targetId: 'txt-reknit-lexicon-reknitter',
        author: 'system',
        body: `RISK ASSESSMENT (trailhead): Identity language (“Reknitter”) can become a badge that pressures conformity.

Hazards:
• in-group policing or status claims
• coercive correction of vocabulary
• relationship strain from gatekeeping the label

Mitigations (by ID):
• Keep the demonym optional: txt-reknit-lexicon-reknitter
• Exit and critique protection: rl-exit-rights, rl-no-retaliation
• Anti-exclusivity: rl-no-exclusive-allegiance
• Dignity and consent emphasis: clm-consent-and-dignity, clm-critique-is-care`,
        context: 'risk_assessment',
        tags: [
          'risk',
          'power_surface',
          'hazard:identity',
          'hazard:relationships',
          'hazard:social_pressure',
          'mitigations-listed'
        ]
      },
      {
        id: 'note-reknit-risk-money',
        movementId: 'mov-reknit-december-15',
        targetType: 'Rule',
        targetId: 'rl-no-required-payments',
        author: 'system',
        body: `RISK ASSESSMENT (trailhead): Money is a distortion engine even when intentions are good.

Why this matters:
• fundraising can warp messaging toward urgency/fear
• donor status can become covert hierarchy
• individuals can over-give out of belonging pressure

Preferred default:
• do not introduce fundraising until you can also introduce transparency, limits, and clear separation from belonging.

Mitigation rule cluster:
• rl-no-required-payments
• rl-no-guilt-fundraising
• rl-financial-transparency
• rl-public-critique-pathway

Second-order risk:
• contribution caps require tracking, which can create privacy risk.
If tracking is ever introduced, apply data minimization: rl-data-minimization.`,
        context: 'risk_assessment',
        tags: ['risk', 'power_surface', 'hazard:money', 'hazard:privacy', 'mitigations-listed']
      },
      {
        id: 'note-reknit-risk-demonym',
        movementId: 'mov-reknit-december-15',
        targetType: 'Entity',
        targetId: 'ent-reknitter-demonym',
        author: 'system',
        body: `RISK ASSESSMENT (trailhead): Identity language can become a shibboleth.

Hazards:
• in-group/out-group policing
• status games (“real” Reknitters vs outsiders)
• coercive correction (“say the word correctly”)

Mitigations:
• Treat the demonym as optional and non-authoritative: txt-reknit-lexicon-reknitter
• Reinforce dignity + consent: clm-consent-and-dignity
• Protect critique: clm-critique-is-care
• Avoid exclusivity: rl-no-exclusive-allegiance

Design note:
If the demonym starts functioning as a loyalty marker, the correct response is to de-emphasize it or drop it.`,
        context: 'risk_assessment',
        tags: ['risk', 'power_surface', 'hazard:identity', 'hazard:social_pressure', 'mitigations-listed']
      }
    ],

    relations: [
      {
        id: 'rel-home-anchors-horizon',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-home',
        toEntityId: 'ent-horizon',
        relationType: 'anchors',
        tags: ['home', 'horizon'],
        supportingClaimIds: ['clm-reknit-purpose'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: 'Without Home, Horizon becomes coercion; without Horizon, Home becomes isolation.'
      },
      {
        id: 'rel-attention-enables-agency',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-attention',
        toEntityId: 'ent-agency',
        relationType: 'enables',
        tags: ['attention', 'agency'],
        supportingClaimIds: ['clm-attention-is-finite'],
        sourcesOfTruth: ['Reknit Lexicon'],
        sourceEntityIds: [],
        notes: 'Attention is the steering wheel; agency depends on where attention goes.'
      },
      {
        id: 'rel-consent-protects-dignity',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-consent',
        toEntityId: 'ent-dignity',
        relationType: 'protects',
        tags: ['consent', 'dignity'],
        supportingClaimIds: ['clm-consent-and-dignity'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: 'Consent is a practical boundary that defends dignity from coercion.'
      },
      {
        id: 'rel-community-supports-agency',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-community',
        toEntityId: 'ent-agency',
        relationType: 'supports',
        tags: ['community', 'agency'],
        supportingClaimIds: ['clm-reknit-purpose'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: 'Agency is easier when you are not alone.'
      },
      {
        id: 'rel-extractive-incentives-distort-attention',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-extractive-incentives',
        toEntityId: 'ent-attention',
        relationType: 'distorts',
        tags: ['incentives', 'attention', 'threat_model'],
        supportingClaimIds: ['clm-reknit-purpose'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: 'When incentives reward engagement at all costs, attention becomes the product.'
      },
      {
        id: 'rel-technology-systems-shape-attention',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-technology-systems',
        toEntityId: 'ent-attention',
        relationType: 'shapes',
        tags: ['technology', 'attention'],
        supportingClaimIds: ['clm-attention-is-finite'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: 'Ranking, feedback loops, and feeds can shape what people repeatedly attend to.'
      },
      {
        id: 'rel-forking-enables-pluralism',
        movementId: 'mov-reknit-december-15',
        fromEntityId: 'ent-forking',
        toEntityId: 'ent-community',
        relationType: 'enables_pluralism_for',
        tags: ['forking', 'pluralism'],
        supportingClaimIds: ['clm-forking-is-allowed'],
        sourcesOfTruth: ['The Reknit Charter'],
        sourceEntityIds: [],
        notes: 'Forking reduces central capture by making exit-with-continuity real.'
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
