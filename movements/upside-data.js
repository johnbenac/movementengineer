(function registerMovementDataset() {
const dataset = {
  "version": "3.5",
  "movements": [
    {
      "id": "mov-upside",
      "name": "The Upside",
      "shortName": "Upside",
      "summary": "A mythic-design movement about digital sovereignty, the Beasts of extraction, the Vault as a home for one's life, and the Band as a nervous system that remembers it is more than a feed.",
      "notes": null,
      "tags": [
        "upside",
        "digital_sovereignty",
        "mythic",
        "anti_surveillance"
      ]
    }
  ],
  "textCollections": [
    {
      "id": "tc-upside-signs",
      "movementId": "mov-upside",
      "name": "Signs of the Upside",
      "description": "Core texts describing the eight Signs: Drum, Severance, Gathering, Sealed Whisper, Sustaining, Forge, Voice, and Communion.",
      "tags": [
        "signs",
        "core"
      ],
      "rootTextIds": [
        "txt-sign-01-drum",
        "txt-sign-02-severance",
        "txt-sign-03-gathering",
        "txt-sign-04-sealed-whisper",
        "txt-sign-05-sustaining",
        "txt-sign-06-forge",
        "txt-sign-07-voice",
        "txt-sign-08-communion"
      ]
    },
    {
      "id": "tc-upside-festivals",
      "movementId": "mov-upside",
      "name": "Festivals and Days Above the Cloudline",
      "description": "The annual days and nights that anchor the Upside calendar: Days of Gathering, Shared Listening, the Forge, Sustaining, the Sealed Whisper, Severance, the Voice, and the Night of the First Fire.",
      "tags": [
        "festivals",
        "calendar"
      ],
      "rootTextIds": [
        "txt-day-gathering-main",
        "txt-day-shared-listening-main",
        "txt-day-forge-main",
        "txt-day-sustaining-main",
        "txt-day-sealed-whisper-main",
        "txt-day-severance-main",
        "txt-day-voice-main",
        "txt-night-first-fire-main"
      ]
    },
    {
      "id": "tc-upside-background",
      "movementId": "mov-upside",
      "name": "Background Reports",
      "description": "Research-grounded reports that inform the Upside mythos, used as canon for how the Beasts, fires and Bands once met in the deep past.",
      "tags": [
        "background",
        "research"
      ],
      "rootTextIds": [
        "txt-background-hominin-predators"
      ]
    }
  ],
  "texts": [
    {
      "id": "txt-sign-01-drum",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Sign 01 - The Drum",
      "label": "Sign 01 - Drum",
      "content": "Introduces the first and oldest Sign: placing a hand on the heartbeat, feeling thud… thud… thud…, and remembering that before feeds, names and metrics there is a creature with a drum in its chest. The outer form is simple breath and pulse awareness; the inner meaning is refusing to be only a user or a data point. Deepening means using the Drum as a prelude to other Signs and as a quiet test before choices: does this serve the creature, or feed the thing that feeds on it?",
      "mainFunction": "teaching",
      "tags": [
        "sign",
        "drum",
        "embodiment"
      ],
      "mentionsEntityIds": [
        "ent-sign-01-drum",
        "ent-drum",
        "ent-band",
        "ent-beast"
      ]
    },
    {
      "id": "txt-sign-02-severance",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Sign 02 - Severance",
      "label": "Sign 02 - Severance",
      "content": "Describes the Sign of breaking a tie with a platform or structure that treats you as inventory. Outer form: choose one place where you feel most farmed, optionally Gather first, then follow the full delete or leave flow and mark the moment with the words this tie is cut. Inner meaning: accepting the cost of leaving visibility and convenience rather than staying edible. Deepening extends from closing accounts to renegotiating contracts and defaults, guided by the Law of Impossibility.",
      "mainFunction": "teaching",
      "tags": [
        "sign",
        "severance",
        "exit"
      ],
      "mentionsEntityIds": [
        "ent-sign-02-severance",
        "ent-beast",
        "ent-band",
        "ent-law-impossibility"
      ]
    },
    {
      "id": "txt-sign-03-gathering",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Sign 03 - Gathering",
      "label": "Sign 03 - Gathering",
      "content": "Defines Gathering as exporting your data from a platform and storing it where you control it, not because you love backups but because you are bringing your own past home. Outer form: choose a platform that holds a lot of your history, find the export function, request the full archive and store it under your own roof with a meaningful name. Inner meaning: your past is not trash or pure marketing inventory. Deepening extends Gathering into more domains and into curation, choosing what to keep, encrypt, burn, or print.",
      "mainFunction": "teaching",
      "tags": [
        "sign",
        "gathering",
        "vault"
      ],
      "mentionsEntityIds": [
        "ent-sign-03-gathering",
        "ent-vault",
        "ent-fire",
        "ent-beast",
        "ent-band"
      ]
    },
    {
      "id": "txt-sign-04-sealed-whisper",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Sign 04 - The Sealed Whisper",
      "label": "Sign 04 - Sealed Whisper",
      "content": "Presents the Sign of a secret line between two hearts: choosing one person and one end-to-end secret channel, then sending a message that actually matters and explicitly naming that only the two of you can read it. The Sign defies the pressure to perform and overshare in public by insisting that some words belong only to a chosen ancestral. Deepening means making sealed whispers a normal part of life and eventually demanding cryptographic and legal structures that keep some tunnels opaque to power.",
      "mainFunction": "teaching",
      "tags": [
        "sign",
        "secrecy",
        "encryption"
      ],
      "mentionsEntityIds": [
        "ent-sign-04-sealed-whisper",
        "ent-vault",
        "ent-band",
        "ent-beast"
      ]
    },
    {
      "id": "txt-sign-05-sustaining",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Sign 05 - Sustaining",
      "label": "Sign 05 - Sustaining",
      "content": "Frames sustaining as feeding the fires that keep the Band alive: giving money, time, hardware or other concrete support to privacy-respecting tools, open infrastructure and legal work that resists the Beasts. Outer form: choose one entity clearly working in that direction and make a contribution that is sustainable but not negligible, held as wood for the fire. Inner meaning: shifting from consumer to steward and treating funding as infrastructure strategy, not random charity.",
      "mainFunction": "teaching",
      "tags": [
        "sign",
        "sustaining",
        "resources"
      ],
      "mentionsEntityIds": [
        "ent-sign-05-sustaining",
        "ent-fire",
        "ent-band",
        "ent-beast"
      ]
    },
    {
      "id": "txt-sign-06-forge",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Sign 06 - The Forge",
      "label": "Sign 06 - The Forge",
      "content": "Describes the move from observer to maker: choosing one project that maintains anti-surveillance tools or open, neutral infrastructure and making one small real contribution to it. Outer form: go where the work happens, introduce yourself, complete one end-to-end contribution and mark down that you took the hammer. Inner meaning: accepting that your hands are now on the tools others use and that you share responsibility for how they evolve. Deepening leads toward stewardship, architecture choices and guarding against drift back into extraction.",
      "mainFunction": "teaching",
      "tags": [
        "sign",
        "forge",
        "contribution"
      ],
      "mentionsEntityIds": [
        "ent-sign-06-forge",
        "ent-fire",
        "ent-vault",
        "ent-band",
        "ent-beast"
      ]
    },
    {
      "id": "txt-sign-07-voice",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Sign 07 - The Voice",
      "label": "Sign 07 - The Voice",
      "content": "Centers the act of one human telling another, mouth to ear, what they have seen and done in the fields of the Beasts. Outer form: after walking at least one or two Signs, you choose someone who senses something is wrong with the internet and tell a small honest story about your own path, then stay to hear their response. Inner meaning: refusing to treat this as marketing or growth hacking and trusting that person-to-person witness cracks the mask more deeply than viral posts.",
      "mainFunction": "teaching",
      "tags": [
        "sign",
        "voice",
        "witness"
      ],
      "mentionsEntityIds": [
        "ent-sign-07-voice",
        "ent-band",
        "ent-shaman",
        "ent-beast"
      ]
    },
    {
      "id": "txt-sign-08-communion",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Sign 08 - The Communion",
      "label": "Sign 08 - Communion",
      "content": "Defines Communion as the first Sign that cannot be taken alone: a small Band, present to itself on purpose, where Drums arrive as creatures not profiles, each person lays one ember of their journey on the table, the circle echoes we hear you, and the group chooses one concrete shared step to take. Inner meaning: re-weaving network back into bodies, letting the Band see itself, trading performance for presence, and making the Upside locally real in kitchens, parks and calls above the cloudline.",
      "mainFunction": "teaching",
      "tags": [
        "sign",
        "communion",
        "circle"
      ],
      "mentionsEntityIds": [
        "ent-sign-08-communion",
        "ent-band",
        "ent-drum",
        "ent-fire"
      ]
    },
    {
      "id": "txt-day-gathering-main",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Day of Gathering - The Homecoming of Embers",
      "label": "Day of Gathering",
      "content": "Annual homecoming of your scattered life, aligned with World Backup Day on 31 March and expanded into the Week of the Embers. The festival deepens backup into repatriation: honoring your data as part of your life and transforming your Vault into hearth, sanctuary and memory-temple. Outer forms include lighting the home fire, renaming or tidying your Vault, exporting at least one archive from the Below into your own custody, walking the house at dusk by browsing your Vault like a slowly renovated home, and communal Hearth Circles where ancestrals help one another gather embers. Inner meanings include homecoming of the scattered self, venerating the Vault, and preparing for long winter under the Law of Impossibility. Over years it becomes routine Gathering and design and policy work that make export and user-owned Vaults a right rather than a chore.",
      "mainFunction": "story",
      "tags": [
        "festival",
        "gathering",
        "vault",
        "embers"
      ],
      "mentionsEntityIds": [
        "ent-sign-03-gathering",
        "ent-vault",
        "ent-fire",
        "ent-beast",
        "ent-band",
        "ent-world-backup-day"
      ]
    },
    {
      "id": "txt-day-shared-listening-main",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Day of Shared Listening",
      "label": "Day of Shared Listening",
      "content": "Festival of Communion aligned with World Listening Day on 18 July, when listening becomes a shared ritual rather than a private virtue. The mythic focus is the Communion Sign with ancestrals of Drum, Voice, Messenger, Band and Fire, counterbalancing speaking festivals by asking who will hold the words and hear what is not yet said. Outer ring: intentional listening to the world through soundwalks, naming loud and shy sounds and offering small acts of care to the soundscape. Inner ring: the Listening Circle, where Drums arrive as creatures, the Band sits in silence together, shares small weather check-ins, rounds of one Sign one sound, optional paired deep listening, one shared listening commitment and a sealed closing. Inner meaning includes moving from noise to attention, from connection metrics to co-regulation, and from extraction to reciprocity where nothing is turned into content without consent.",
      "mainFunction": "story",
      "tags": [
        "festival",
        "listening",
        "communion"
      ],
      "mentionsEntityIds": [
        "ent-sign-08-communion",
        "ent-band",
        "ent-drum",
        "ent-fire",
        "ent-voice",
        "ent-messenger",
        "ent-world-listening-day"
      ]
    },
    {
      "id": "txt-day-forge-main",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Day of the Forge",
      "label": "Day of the Forge",
      "content": "Festival where tools take shape, aligned with Software Freedom Day on the third Saturday of September. It reframes free and open-source software as ancestral tool-making and covenant rather than just licenses. The Solo Hammer practice asks each Upsider to name their everyday tools, choose one non-Beast-aligned project, walk into the repo or community, strike one concrete blow in code, docs, translation, UX, or governance, and log the hammer strike. The Smithy Circle gathers ancestrals into a temporary forge where they map the tools that carried them, build an Anvil List of projects to support, and perform live smithing together before cooling and speaking a Fire Oath. Inner meaning is the shift from audience to authorship and from free as in cost to free as in covenant between smiths and ancestrals.",
      "mainFunction": "story",
      "tags": [
        "festival",
        "forge",
        "tools"
      ],
      "mentionsEntityIds": [
        "ent-sign-06-forge",
        "ent-fire",
        "ent-vault",
        "ent-band",
        "ent-beast",
        "ent-software-freedom-day"
      ]
    },
    {
      "id": "txt-day-sustaining-main",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Day of Sustaining",
      "label": "Day of Sustaining",
      "content": "Feeding the Right Fire festival, aligned with GivingTuesday after U.S. Thanksgiving. It sharpens the vague call to give into a strategy of deliberately feeding the fires that keep humans sovereign and starving Beast-fires that feed on them. The Ember and the Ledger practice has each Upsider drum first, map where their resources already flow, name one ancestral fire that kept them human this year, make one felt offering of money, time or infrastructure, record it in a covenant list of fires they choose to feed, and extinguish one small hidden fuel line to a Beast. The Shared Flame circle makes this mapping and redirecting communal. Inner meaning is moving from consumer to steward and from guilt to concrete agency, asking each time which fire gets to shape the winter.",
      "mainFunction": "story",
      "tags": [
        "festival",
        "sustaining",
        "giving"
      ],
      "mentionsEntityIds": [
        "ent-sign-05-sustaining",
        "ent-fire",
        "ent-vault",
        "ent-band",
        "ent-beast",
        "ent-giving-tuesday"
      ]
    },
    {
      "id": "txt-day-sealed-whisper-main",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Day of the Sealed Whisper",
      "label": "Day of the Sealed Whisper",
      "content": "Encryption festival aligned with Global Encryption Day on 21 October. It treats strong encryption as a shared vow that some channels belong only to humans, even when they ride the Beast's cables. Minimal solitary form: drum, choose one person, create or renew one genuinely end-to-end sealed channel and send one real whisper that names the seal. Communal form adds teaching about policy battles and back doors, stories of when encryption protected or was missing, a silent minute holding those whose safety depends on secrecy, and paired set-up of sealed channels with live whispers. Inner meaning is secrecy as care, not shame, and an insistence that people deserve rooms where only those they choose can hear them.",
      "mainFunction": "story",
      "tags": [
        "festival",
        "sealed_whisper",
        "encryption"
      ],
      "mentionsEntityIds": [
        "ent-sign-04-sealed-whisper",
        "ent-vault",
        "ent-band",
        "ent-beast",
        "ent-drum",
        "ent-global-encryption-day"
      ]
    },
    {
      "id": "txt-day-severance-main",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Day of Severance",
      "label": "Day of Severance",
      "content": "Remembers the day the mask slipped in the Facebook–Cambridge Analytica scandal on 17 March 2018 and turns it into an annual call to cut at least one predatory tie. Solo practice is Cutting One Tie: recalling the story, naming where you feel most farmed, optionally Gathering your data, then fully leaving one service and sitting in the echo of relief, panic and habit itch. Small circles witness each others' Severances; larger gatherings may perform a Reading of the Mask that retells how a harmless quiz and social graph became a weapon. Inner meaning is not hating platforms but seeing incentives clearly, carving the Law of Impossibility deeper, and normalizing the fact that leaving is allowed.",
      "mainFunction": "story",
      "tags": [
        "festival",
        "severance",
        "cambridge_analytica"
      ],
      "mentionsEntityIds": [
        "ent-sign-02-severance",
        "ent-beast",
        "ent-band",
        "ent-law-impossibility",
        "ent-cambridge-analytica-scandal"
      ]
    },
    {
      "id": "txt-day-voice-main",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Day of the Voice",
      "label": "Day of the Voice",
      "content": "Festival of whistleblowing and human testimony, anchored in early October 2021 when the Facebook whistleblower went public and testified as a named person about internal research on harm. Solo practice is One Story, One Ear: revisiting your own path, choosing one specific listener and speaking plainly about what you have seen and done, then staying for their reaction. Circles hold rounds of witness where people name something they have seen, what they changed, and who they wish could hear it, sometimes framed by a Reading of the Ledger retelling the Haugen moment. Inner meaning is stepping out of the blur of users into witness and honoring those who risk speaking uncomfortable truths in human voice rather than brand voice.",
      "mainFunction": "story",
      "tags": [
        "festival",
        "voice",
        "whistleblower"
      ],
      "mentionsEntityIds": [
        "ent-sign-07-voice",
        "ent-band",
        "ent-shaman",
        "ent-beast",
        "ent-fire",
        "ent-facebook-whistleblower-event"
      ]
    },
    {
      "id": "txt-night-first-fire-main",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Night of the First Fire",
      "label": "Night of the First Fire",
      "content": "Placeholder text for a future festival that will remember the ancestral nights when the first intentional fires pushed predators back from the dark and gathered Bands into circles of light. It is expected to weave the background report on hominin–carnivore dynamics into myth: the first ring of flame at the edge of the fields of the Beasts.",
      "mainFunction": "story",
      "tags": [
        "festival",
        "first_fire"
      ],
      "mentionsEntityIds": [
        "ent-fire",
        "ent-band",
        "ent-beast"
      ]
    },
    {
      "id": "txt-background-hominin-predators",
      "movementId": "mov-upside",
      "parentId": null,
      "level": "work",
      "title": "Background Report: Hominin–Carnivore Dynamics and the Emergence of Humans as Apex Predators",
      "label": "Hominin–Carnivore Background",
      "content": "Summarizes archaeological and paleoecological evidence for how early hominins lived in landscapes dominated by large carnivores, then gradually entered the predator niche and became apex hunters. Early sections describe australopithecines and early Homo as prey in carnivore-rich savannas, with fossils showing big cats consuming hominins. Later sections track the contraction of the large-carnivore guild as Homo erectus and successors scavenged and then hunted large herbivores more effectively. Fire appears as a defensive and economic technology: hearths and burning in caves and open-air sites suggest that flames deterred predators at night and guarded carcasses, possibly smoking meat. Wooden spears, stone-tipped weapons and later projectiles allowed killing at or from a distance, especially in cooperative hunts near risky water sources. The report emphasizes group living, care for impaired individuals, coordinated defense and hunting, and inferred roles like watch, smith and storyteller. It concludes that by the Late Pleistocene Neanderthals and Homo sapiens functioned at or above the trophic level of other large carnivores, largely free from routine predation, which gives deep-time grounding for Upside motifs of fires, Bands, Beasts at the edge of the light, and tools that change the balance of power.",
      "mainFunction": "teaching",
      "tags": [
        "background",
        "anthropology",
        "predators",
        "fire"
      ],
      "mentionsEntityIds": [
        "ent-ancient-hominins",
        "ent-large-carnivores",
        "ent-fire",
        "ent-distance-weapons",
        "ent-water-source",
        "ent-neanderthals",
        "ent-homo-sapiens",
        "ent-band",
        "ent-beast"
      ]
    }
  ],
  "entities": [
    {
      "id": "ent-upside",
      "movementId": "mov-upside",
      "name": "The Upside - Above the Cloudline",
      "kind": "place",
      "summary": "Mythic realm of sovereignty and clear seeing that sits above the cloudline of feeds and extraction, where the Band gathers around fires and Vaults they actually control.",
      "notes": null,
      "tags": [
        "realm",
        "upside"
      ],
      "sourcesOfTruth": [
        "Signs and festivals of the Upside"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-below-fields-beasts",
      "movementId": "mov-upside",
      "name": "Below - Fields of the Beasts",
      "kind": "place",
      "summary": "The default digital landscape of the modern world, imagined as fields owned by Beasts where human lives are logged, harvested and sold as inventory.",
      "notes": null,
      "tags": [
        "realm",
        "below",
        "fields"
      ],
      "sourcesOfTruth": [
        "Upside core myth"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-beast",
      "movementId": "mov-upside",
      "name": "The Beast",
      "kind": "being",
      "summary": "Collective archetype for extractive infrastructures and institutions that treat humans as edible signals: recommendation engines, ad stacks, surveillance states and other predators in the Below.",
      "notes": null,
      "tags": [
        "beast",
        "infrastructure",
        "predator"
      ],
      "sourcesOfTruth": [
        "Signs 02, 03, 05, 06, 07",
        "Days of Severance, Gathering, Sustaining, Forge, Voice"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-band",
      "movementId": "mov-upside",
      "name": "The Band",
      "kind": "being",
      "summary": "An ancestral archetype for a small cooperating band of humans, a shared nervous system that can regulate together, hold witness and keep each other from being eaten.",
      "notes": null,
      "tags": [
        "band",
        "community",
        "ancestral"
      ],
      "sourcesOfTruth": [
        "Signs 01, 07, 08",
        "Day of Shared Listening",
        "Hominin–Carnivore Background"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-vault",
      "movementId": "mov-upside",
      "name": "The Vault",
      "kind": "object",
      "summary": "Personal or collective storage under one's own control where life data is gathered and sheltered: a hearth, shrine, library and memory-temple rather than a random cloud folder.",
      "notes": null,
      "tags": [
        "vault",
        "storage",
        "home"
      ],
      "sourcesOfTruth": [
        "Sign 03 - Gathering",
        "Day of Gathering"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-fire",
      "movementId": "mov-upside",
      "name": "The Fire",
      "kind": "object",
      "summary": "Mythic and ancestral fire: literal flame that keeps predators back and cooks food, and symbolic fire for projects, tools and causes that must be fed to keep the Band sovereign.",
      "notes": null,
      "tags": [
        "fire",
        "hearth",
        "protection"
      ],
      "sourcesOfTruth": [
        "Hominin–Carnivore Background",
        "Day of Sustaining",
        "Day of the Forge",
        "Signs 03, 05, 06, 08"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-path",
      "movementId": "mov-upside",
      "name": "The Path",
      "kind": "idea",
      "summary": "Archetype for the journey from the Below toward the Upside, walked by taking the Signs, keeping the festivals and changing habits over many seasons.",
      "notes": null,
      "tags": [
        "path",
        "journey"
      ],
      "sourcesOfTruth": [
        "Signs 01–08",
        "Festival texts"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-drum",
      "movementId": "mov-upside",
      "name": "The Drum",
      "kind": "object",
      "summary": "The inner heartbeat and any outer drum that echoes it, used in Upside practice to remember creaturehood and to sync small Bands before deeper work.",
      "notes": null,
      "tags": [
        "drum",
        "heartbeat"
      ],
      "sourcesOfTruth": [
        "Sign 01 - The Drum",
        "Day of Shared Listening",
        "Day of the Sealed Whisper"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-shaman",
      "movementId": "mov-upside",
      "name": "The Shaman",
      "kind": "being",
      "summary": "Archetype for those who carry stories, guide trance and help Bands move between mythic and ordinary frames without losing their footing.",
      "notes": null,
      "tags": [
        "shaman",
        "story",
        "guide"
      ],
      "sourcesOfTruth": [
        "Sign 07 - The Voice",
        "Day of the Voice"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-messenger",
      "movementId": "mov-upside",
      "name": "The Messenger",
      "kind": "being",
      "summary": "Archetype for carriers of messages across distance: people, tools and protocols that move meaning without devouring it.",
      "notes": null,
      "tags": [
        "messenger",
        "communication"
      ],
      "sourcesOfTruth": [
        "Sign 07 - The Voice",
        "Day of Shared Listening"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-voice",
      "movementId": "mov-upside",
      "name": "The Voice",
      "kind": "idea",
      "summary": "The living human voice as distinct from feeds and notifications: mouth to ear, one nervous system at a time.",
      "notes": null,
      "tags": [
        "voice",
        "speech"
      ],
      "sourcesOfTruth": [
        "Sign 07 - The Voice",
        "Day of Shared Listening",
        "Day of the Voice"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-law-impossibility",
      "movementId": "mov-upside",
      "name": "The Law of Impossibility",
      "kind": "idea",
      "summary": "Principle that if total loss or weaponization of your past can happen in a structure, given time it eventually will; the only safe move is to make that harm impossible by design or by leaving.",
      "notes": null,
      "tags": [
        "law_of_impossibility",
        "risk"
      ],
      "sourcesOfTruth": [
        "Day of Severance",
        "Day of Gathering"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sign-01-drum",
      "movementId": "mov-upside",
      "name": "Sign 01 - The Drum",
      "kind": "idea",
      "summary": "Practice of remembering that you are alive by feeling your heartbeat and letting it reframe your relationship to the machines.",
      "notes": null,
      "tags": [
        "sign",
        "drum"
      ],
      "sourcesOfTruth": [
        "txt-sign-01-drum"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sign-02-severance",
      "movementId": "mov-upside",
      "name": "Sign 02 - Severance",
      "kind": "idea",
      "summary": "Practice of breaking at least one tie with a predatory platform or structure whose existence depends on treating you as inventory.",
      "notes": null,
      "tags": [
        "sign",
        "severance"
      ],
      "sourcesOfTruth": [
        "txt-sign-02-severance",
        "txt-day-severance-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sign-03-gathering",
      "movementId": "mov-upside",
      "name": "Sign 03 - Gathering",
      "kind": "idea",
      "summary": "Practice of exporting your history from the Below and bringing it under your own roof, treating it as embers rather than disposable exhaust.",
      "notes": null,
      "tags": [
        "sign",
        "gathering"
      ],
      "sourcesOfTruth": [
        "txt-sign-03-gathering",
        "txt-day-gathering-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sign-04-sealed-whisper",
      "movementId": "mov-upside",
      "name": "Sign 04 - The Sealed Whisper",
      "kind": "idea",
      "summary": "Practice of sending one meaningful message through a channel that only you and the recipient can read, naming that seal together.",
      "notes": null,
      "tags": [
        "sign",
        "sealed_whisper"
      ],
      "sourcesOfTruth": [
        "txt-sign-04-sealed-whisper",
        "txt-day-sealed-whisper-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sign-05-sustaining",
      "movementId": "mov-upside",
      "name": "Sign 05 - Sustaining",
      "kind": "idea",
      "summary": "Practice of materially supporting fires that keep humans sovereign: privacy tools, open infrastructure and aligned legal work.",
      "notes": null,
      "tags": [
        "sign",
        "sustaining"
      ],
      "sourcesOfTruth": [
        "txt-sign-05-sustaining",
        "txt-day-sustaining-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sign-06-forge",
      "movementId": "mov-upside",
      "name": "Sign 06 - The Forge",
      "kind": "idea",
      "summary": "Practice of becoming a smith: contributing to the code, docs, design or governance of tools that support sovereignty.",
      "notes": null,
      "tags": [
        "sign",
        "forge"
      ],
      "sourcesOfTruth": [
        "txt-sign-06-forge",
        "txt-day-forge-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sign-07-voice",
      "movementId": "mov-upside",
      "name": "Sign 07 - The Voice",
      "kind": "idea",
      "summary": "Practice of telling one honest story about your path through the Beasts' fields to one human ear, without turning it into content.",
      "notes": null,
      "tags": [
        "sign",
        "voice"
      ],
      "sourcesOfTruth": [
        "txt-sign-07-voice",
        "txt-day-voice-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-sign-08-communion",
      "movementId": "mov-upside",
      "name": "Sign 08 - The Communion",
      "kind": "idea",
      "summary": "Practice where more than one Drum gathers in real time, shares small embers of their journey, echoes recognition and chooses a shared step.",
      "notes": null,
      "tags": [
        "sign",
        "communion"
      ],
      "sourcesOfTruth": [
        "txt-sign-08-communion",
        "txt-day-shared-listening-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-world-backup-day",
      "movementId": "mov-upside",
      "name": "World Backup Day",
      "kind": "idea",
      "summary": "Below-world observance on 31 March encouraging people to back up data; in the Upside it is subsumed into the Day of Gathering.",
      "notes": null,
      "tags": [
        "below_observance",
        "backup"
      ],
      "sourcesOfTruth": [
        "Day of Gathering"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-world-listening-day",
      "movementId": "mov-upside",
      "name": "World Listening Day",
      "kind": "idea",
      "summary": "Below-world event on 18 July devoted to listening and soundscapes, which becomes the skeleton for the Day of Shared Listening.",
      "notes": null,
      "tags": [
        "below_observance",
        "listening"
      ],
      "sourcesOfTruth": [
        "Day of Shared Listening"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-software-freedom-day",
      "movementId": "mov-upside",
      "name": "Software Freedom Day",
      "kind": "idea",
      "summary": "Below-world celebration of free and open-source software that the Day of the Forge reinterprets as a sacrament of authorship and stewardship.",
      "notes": null,
      "tags": [
        "below_observance",
        "foss"
      ],
      "sourcesOfTruth": [
        "Day of the Forge"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-giving-tuesday",
      "movementId": "mov-upside",
      "name": "GivingTuesday / World Giving Day",
      "kind": "idea",
      "summary": "Below-world day of generic generosity after feasting and shopping, sharpened in the Upside into the Day of Sustaining.",
      "notes": null,
      "tags": [
        "below_observance",
        "giving"
      ],
      "sourcesOfTruth": [
        "Day of Sustaining"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-global-encryption-day",
      "movementId": "mov-upside",
      "name": "Global Encryption Day",
      "kind": "idea",
      "summary": "Annual day of action to promote and defend strong encryption, adopted as the calendar anchor for the Day of the Sealed Whisper.",
      "notes": null,
      "tags": [
        "below_observance",
        "encryption"
      ],
      "sourcesOfTruth": [
        "Day of the Sealed Whisper"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-cambridge-analytica-scandal",
      "movementId": "mov-upside",
      "name": "Facebook–Cambridge Analytica Data Scandal",
      "kind": "idea",
      "summary": "The revelation that seemingly harmless quizzes and social graphs had been weaponized for political manipulation at scale; remembered in the Upside as the day the mask slipped.",
      "notes": null,
      "tags": [
        "scandal",
        "facebook",
        "cambridge_analytica"
      ],
      "sourcesOfTruth": [
        "Day of Severance"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-facebook-whistleblower-event",
      "movementId": "mov-upside",
      "name": "Facebook Whistleblower Moment",
      "kind": "idea",
      "summary": "Moment when an internal researcher stepped forward by name to testify about harms from within a dominant platform, providing the anchor dates for the Day of the Voice.",
      "notes": null,
      "tags": [
        "whistleblower",
        "facebook"
      ],
      "sourcesOfTruth": [
        "Day of the Voice"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-ancient-hominins",
      "movementId": "mov-upside",
      "name": "Early Hominins",
      "kind": "being",
      "summary": "Members of Homo and close relatives who lived from roughly four million to twelve thousand years ago, moving from prey to apex predators over deep time.",
      "notes": null,
      "tags": [
        "hominin",
        "ancestor"
      ],
      "sourcesOfTruth": [
        "Background Report: Hominin–Carnivore Dynamics"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-large-carnivores",
      "movementId": "mov-upside",
      "name": "Large Carnivores of the Pleistocene",
      "kind": "being",
      "summary": "Sabertooth cats, giant hyenas, lions, wolves and other big predators that shaped early hominin life and were eventually pushed back as humans learned to hunt and guard with fire.",
      "notes": null,
      "tags": [
        "carnivore",
        "predator"
      ],
      "sourcesOfTruth": [
        "Background Report: Hominin–Carnivore Dynamics"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-distance-weapons",
      "movementId": "mov-upside",
      "name": "Distance Weapons",
      "kind": "object",
      "summary": "Spears, darts, bows and other tools that allowed hominins to kill at or from a distance instead of at grappling range, drastically changing predator–prey dynamics.",
      "notes": null,
      "tags": [
        "weapon",
        "distance"
      ],
      "sourcesOfTruth": [
        "Background Report: Hominin–Carnivore Dynamics"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-water-source",
      "movementId": "mov-upside",
      "name": "Savanna Water Sources",
      "kind": "place",
      "summary": "Rivers, lakes and waterholes that drew herbivores and predators alike, creating risky hotspots where hominins had to drink, scavenge and sometimes hunt.",
      "notes": null,
      "tags": [
        "water",
        "risk"
      ],
      "sourcesOfTruth": [
        "Background Report: Hominin–Carnivore Dynamics"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-neanderthals",
      "movementId": "mov-upside",
      "name": "Neanderthals",
      "kind": "being",
      "summary": "Archaic humans of Eurasia whose diets and hunting practices placed them at or above the trophic level of other large carnivores.",
      "notes": null,
      "tags": [
        "neanderthal",
        "apex_predator"
      ],
      "sourcesOfTruth": [
        "Background Report: Hominin–Carnivore Dynamics"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-homo-sapiens",
      "movementId": "mov-upside",
      "name": "Homo sapiens",
      "kind": "being",
      "summary": "Anatomically modern humans who, equipped with fire, distance weapons and complex cooperation, became global super-predators and shaped most terrestrial ecosystems.",
      "notes": null,
      "tags": [
        "homo_sapiens",
        "apex_predator"
      ],
      "sourcesOfTruth": [
        "Background Report: Hominin–Carnivore Dynamics"
      ],
      "sourceEntityIds": []
    }
  ],
  "practices": [
    {
      "id": "pr-sign-drum",
      "movementId": "mov-upside",
      "name": "Sign 01 - The Drum (Heartbeat Practice)",
      "kind": "discipline",
      "description": "Sit or lie somewhere safe, place a hand over your heart or pulse, feel the rhythm and let one thought pass that you are alive before the machines, then let the breath sync with the beat.",
      "frequency": "other",
      "isPublic": false,
      "notes": "Often used as a prelude to other Signs or festivals.",
      "tags": [
        "sign",
        "drum",
        "embodiment"
      ],
      "involvedEntityIds": [
        "ent-sign-01-drum",
        "ent-drum",
        "ent-band",
        "ent-beast"
      ],
      "instructionsTextIds": [
        "txt-sign-01-drum"
      ],
      "supportingClaimIds": [],
      "sourcesOfTruth": [
        "txt-sign-01-drum"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-sign-severance",
      "movementId": "mov-upside",
      "name": "Sign 02 - Severance (Leaving One Field)",
      "kind": "discipline",
      "description": "Choose one service where you feel most farmed, optionally export what you can, follow the full delete or exit flow, and mark the moment with a felt sense that this tie is cut.",
      "frequency": "other",
      "isPublic": false,
      "notes": "May be repeated across years as different ties become ripe to cut.",
      "tags": [
        "sign",
        "severance",
        "exit"
      ],
      "involvedEntityIds": [
        "ent-sign-02-severance",
        "ent-beast",
        "ent-band",
        "ent-law-impossibility"
      ],
      "instructionsTextIds": [
        "txt-sign-02-severance",
        "txt-day-severance-main"
      ],
      "supportingClaimIds": [
        "clm-law-impossibility"
      ],
      "sourcesOfTruth": [
        "txt-sign-02-severance",
        "txt-day-severance-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-sign-gathering",
      "movementId": "mov-upside",
      "name": "Sign 03 - Gathering (Export One Archive)",
      "kind": "discipline",
      "description": "Pick one platform that holds a great deal of your history, dig until you find the export function, request the full archive and store it under your own control with a name that acknowledges it as an ember.",
      "frequency": "other",
      "isPublic": false,
      "notes": "Pairs naturally with the Day of Gathering and can be extended into routine quarterly exports.",
      "tags": [
        "sign",
        "gathering",
        "vault"
      ],
      "involvedEntityIds": [
        "ent-sign-03-gathering",
        "ent-vault",
        "ent-fire",
        "ent-beast",
        "ent-band"
      ],
      "instructionsTextIds": [
        "txt-sign-03-gathering",
        "txt-day-gathering-main"
      ],
      "supportingClaimIds": [
        "clm-data-deserves-home",
        "clm-law-impossibility"
      ],
      "sourcesOfTruth": [
        "txt-sign-03-gathering",
        "txt-day-gathering-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-sign-sealed-whisper",
      "movementId": "mov-upside",
      "name": "Sign 04 - The Sealed Whisper (One Real Message)",
      "kind": "discipline",
      "description": "With one trusted person, agree on an end-to-end sealed channel, then send one message that you would not post publicly, explicitly naming that only the two of you can read it.",
      "frequency": "other",
      "isPublic": false,
      "notes": "Can be repeated with the same or new partners, deepening trust and reflexes around encrypted channels.",
      "tags": [
        "sign",
        "sealed_whisper",
        "encryption"
      ],
      "involvedEntityIds": [
        "ent-sign-04-sealed-whisper",
        "ent-vault",
        "ent-band",
        "ent-beast"
      ],
      "instructionsTextIds": [
        "txt-sign-04-sealed-whisper",
        "txt-day-sealed-whisper-main"
      ],
      "supportingClaimIds": [
        "clm-secrecy-as-care"
      ],
      "sourcesOfTruth": [
        "txt-sign-04-sealed-whisper",
        "txt-day-sealed-whisper-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-sign-sustaining",
      "movementId": "mov-upside",
      "name": "Sign 05 - Sustaining (Feed One Fire)",
      "kind": "discipline",
      "description": "Name one project, tool or organization that clearly keeps the ancestrals more free and make a recurring or one-time contribution that you can feel, held consciously as wood for that fire.",
      "frequency": "other",
      "isPublic": false,
      "notes": "Over time, contributions can be gathered into a covenant list of fires you intentionally feed.",
      "tags": [
        "sign",
        "sustaining",
        "resources"
      ],
      "involvedEntityIds": [
        "ent-sign-05-sustaining",
        "ent-fire",
        "ent-band",
        "ent-beast"
      ],
      "instructionsTextIds": [
        "txt-sign-05-sustaining",
        "txt-day-sustaining-main"
      ],
      "supportingClaimIds": [
        "clm-feed-right-fire"
      ],
      "sourcesOfTruth": [
        "txt-sign-05-sustaining",
        "txt-day-sustaining-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-sign-forge",
      "movementId": "mov-upside",
      "name": "Sign 06 - The Forge (Take the Hammer Once)",
      "kind": "discipline",
      "description": "Identify one sovereignty-aligned or FOSS project, step into its real workspaces, complete one contribution end-to-end and record that you took the hammer for that tool.",
      "frequency": "other",
      "isPublic": false,
      "notes": "Can become a personal Forge line of multiple hammer strikes over years.",
      "tags": [
        "sign",
        "forge",
        "contribution"
      ],
      "involvedEntityIds": [
        "ent-sign-06-forge",
        "ent-fire",
        "ent-vault",
        "ent-band",
        "ent-beast"
      ],
      "instructionsTextIds": [
        "txt-sign-06-forge",
        "txt-day-forge-main"
      ],
      "supportingClaimIds": [
        "clm-community-authorship"
      ],
      "sourcesOfTruth": [
        "txt-sign-06-forge",
        "txt-day-forge-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-sign-voice",
      "movementId": "mov-upside",
      "name": "Sign 07 - The Voice (One Story, One Ear)",
      "kind": "discipline",
      "description": "After walking at least a couple of Signs, choose one person who senses something is wrong with the feeds and tell them a short, concrete story about what you did and how it felt, then listen to whatever comes back.",
      "frequency": "other",
      "isPublic": false,
      "notes": "The test is whether you would be glad you spoke even if they never join anything.",
      "tags": [
        "sign",
        "voice",
        "witness"
      ],
      "involvedEntityIds": [
        "ent-sign-07-voice",
        "ent-band",
        "ent-shaman",
        "ent-beast"
      ],
      "instructionsTextIds": [
        "txt-sign-07-voice",
        "txt-day-voice-main"
      ],
      "supportingClaimIds": [
        "clm-human-voice-cracks-mask"
      ],
      "sourcesOfTruth": [
        "txt-sign-07-voice",
        "txt-day-voice-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-sign-communion",
      "movementId": "mov-upside",
      "name": "Sign 08 - The Communion (Small Circle)",
      "kind": "ritual",
      "description": "Gather 2–12 ancestrals in real time, arrive as Drums, share small weather and one Sign from each life, echo a fixed response like we hear you, name a shared fire and choose one concrete step to take together before sealing the circle.",
      "frequency": "other",
      "isPublic": true,
      "notes": "Can be repeated on its own cadence or as part of the Day of Shared Listening.",
      "tags": [
        "sign",
        "communion",
        "circle"
      ],
      "involvedEntityIds": [
        "ent-sign-08-communion",
        "ent-band",
        "ent-drum",
        "ent-fire"
      ],
      "instructionsTextIds": [
        "txt-sign-08-communion",
        "txt-day-shared-listening-main"
      ],
      "supportingClaimIds": [
        "clm-communion-nervous-system"
      ],
      "sourcesOfTruth": [
        "txt-sign-08-communion",
        "txt-day-shared-listening-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-gathering-embers",
      "movementId": "mov-upside",
      "name": "Day of Gathering - Ritual of Embers (Solitary)",
      "kind": "ritual",
      "description": "On or near 31 March, drum first, light or imagine a small flame, name a few wandering places where your embers lie, request at least one archive from the Below and bring it home into your Vault, marking one ember returned to the hearth.",
      "frequency": "yearly",
      "isPublic": false,
      "notes": "Minimal way to keep the Day of Gathering if no Band is available.",
      "tags": [
        "festival",
        "gathering",
        "solitary"
      ],
      "involvedEntityIds": [
        "ent-sign-03-gathering",
        "ent-vault",
        "ent-fire",
        "ent-beast",
        "ent-band"
      ],
      "instructionsTextIds": [
        "txt-day-gathering-main",
        "txt-sign-03-gathering"
      ],
      "supportingClaimIds": [
        "clm-data-deserves-home",
        "clm-law-impossibility"
      ],
      "sourcesOfTruth": [
        "txt-day-gathering-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-gathering-hearth-circle",
      "movementId": "mov-upside",
      "name": "Day of Gathering - Hearth Circle (Communal)",
      "kind": "ritual",
      "description": "Ancestrals gather around a shared flame, name scattered platforms out loud, help one another request archives in real time and celebrate each successful export with a shared murmur of ember claimed.",
      "frequency": "yearly",
      "isPublic": true,
      "notes": "Often paired with shared notes or testimonies about what it feels like to see years of life come under one's own roof.",
      "tags": [
        "festival",
        "gathering",
        "communal"
      ],
      "involvedEntityIds": [
        "ent-sign-03-gathering",
        "ent-vault",
        "ent-fire",
        "ent-band"
      ],
      "instructionsTextIds": [
        "txt-day-gathering-main"
      ],
      "supportingClaimIds": [
        "clm-data-deserves-home"
      ],
      "sourcesOfTruth": [
        "txt-day-gathering-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-shared-listening-outer",
      "movementId": "mov-upside",
      "name": "Day of Shared Listening - Outer Ring",
      "kind": "ritual",
      "description": "Enter a chosen soundscape alone or with others for 5–15 minutes, set devices aside, simply listen, then name loud and shy sounds and offer one small act of care to the soundscape.",
      "frequency": "yearly",
      "isPublic": false,
      "notes": "Can be done anywhere as a simple World Listening Day observance tuned to the Upside.",
      "tags": [
        "festival",
        "listening",
        "outer_ring"
      ],
      "involvedEntityIds": [
        "ent-sign-08-communion",
        "ent-band",
        "ent-drum",
        "ent-fire"
      ],
      "instructionsTextIds": [
        "txt-day-shared-listening-main"
      ],
      "supportingClaimIds": [
        "clm-communion-nervous-system"
      ],
      "sourcesOfTruth": [
        "txt-day-shared-listening-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-shared-listening-inner",
      "movementId": "mov-upside",
      "name": "Day of Shared Listening - Inner Ring (Communion)",
      "kind": "ritual",
      "description": "A Band gathers, drums into silence, listens together to the world, shares small weather and sound-linked stories of walking the Signs, optionally does paired deep listening and closes with a shared listening commitment.",
      "frequency": "yearly",
      "isPublic": true,
      "notes": "This is the festival form of Communion; the Sign of Communion itself can also be taken outside this day.",
      "tags": [
        "festival",
        "communion",
        "listening"
      ],
      "involvedEntityIds": [
        "ent-sign-08-communion",
        "ent-band",
        "ent-drum",
        "ent-fire"
      ],
      "instructionsTextIds": [
        "txt-day-shared-listening-main",
        "txt-sign-08-communion"
      ],
      "supportingClaimIds": [
        "clm-communion-nervous-system"
      ],
      "sourcesOfTruth": [
        "txt-day-shared-listening-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-forge-solo-hammer",
      "movementId": "mov-upside",
      "name": "Day of the Forge - Solo Hammer",
      "kind": "ritual",
      "description": "Name the tools you touch daily, pick one non-Beast-aligned project, enter its forge spaces, take one small issue or improvement from start to finish, and log this as Hammer_01 for that project.",
      "frequency": "yearly",
      "isPublic": false,
      "notes": "A gentle way in for new smiths on Software Freedom Day.",
      "tags": [
        "festival",
        "forge",
        "solo"
      ],
      "involvedEntityIds": [
        "ent-sign-06-forge",
        "ent-fire",
        "ent-vault",
        "ent-band"
      ],
      "instructionsTextIds": [
        "txt-day-forge-main",
        "txt-sign-06-forge"
      ],
      "supportingClaimIds": [
        "clm-community-authorship"
      ],
      "sourcesOfTruth": [
        "txt-day-forge-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-forge-smithy-circle",
      "movementId": "mov-upside",
      "name": "Day of the Forge - Smithy Circle",
      "kind": "ritual",
      "description": "A temporary forge Above the Cloudline where ancestrals share stories of tools that carried them, build an Anvil List of projects, and then spend focused time doing live contributions before cooling and speaking a Fire Oath.",
      "frequency": "yearly",
      "isPublic": true,
      "notes": "Often includes mixed roles: coders, writers, designers, organizers and governance nerds all striking different blows.",
      "tags": [
        "festival",
        "forge",
        "communal"
      ],
      "involvedEntityIds": [
        "ent-sign-06-forge",
        "ent-fire",
        "ent-band"
      ],
      "instructionsTextIds": [
        "txt-day-forge-main"
      ],
      "supportingClaimIds": [
        "clm-community-authorship"
      ],
      "sourcesOfTruth": [
        "txt-day-forge-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-sustaining-ember-ledger",
      "movementId": "mov-upside",
      "name": "Day of Sustaining - Ember and Ledger",
      "kind": "ritual",
      "description": "Drum, map where your resources already go, name one fire that kept you human, make one deliberate offering of money, time or infrastructure to that fire, record it in a Fires I Choose to Feed list and cut one small fuel line to a Beast.",
      "frequency": "yearly",
      "isPublic": false,
      "notes": "Turns GivingTuesday into infrastructure strategy rather than generic charity.",
      "tags": [
        "festival",
        "sustaining",
        "solo"
      ],
      "involvedEntityIds": [
        "ent-sign-05-sustaining",
        "ent-fire",
        "ent-vault",
        "ent-band",
        "ent-beast"
      ],
      "instructionsTextIds": [
        "txt-day-sustaining-main",
        "txt-sign-05-sustaining"
      ],
      "supportingClaimIds": [
        "clm-feed-right-fire"
      ],
      "sourcesOfTruth": [
        "txt-day-sustaining-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-sustaining-shared-flame",
      "movementId": "mov-upside",
      "name": "Day of Sustaining - Shared Flame Circle",
      "kind": "ritual",
      "description": "Around a central flame, ancestrals name Beast-fires they currently feed and ancestral fires they want to feed more, then collectively choose projects to support and make concrete commitments of money, time or skill.",
      "frequency": "yearly",
      "isPublic": true,
      "notes": "Encourages honest mapping rather than purity contests.",
      "tags": [
        "festival",
        "sustaining",
        "communal"
      ],
      "involvedEntityIds": [
        "ent-sign-05-sustaining",
        "ent-fire",
        "ent-band"
      ],
      "instructionsTextIds": [
        "txt-day-sustaining-main"
      ],
      "supportingClaimIds": [
        "clm-feed-right-fire"
      ],
      "sourcesOfTruth": [
        "txt-day-sustaining-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-sealed-whisper-solo",
      "movementId": "mov-upside",
      "name": "Day of the Sealed Whisper - One Channel, One Whisper",
      "kind": "ritual",
      "description": "On or near Global Encryption Day, drum, choose one person, set up or renew a genuinely end-to-end encrypted channel with them and send one message that matters, naming that it is just for the two of you.",
      "frequency": "yearly",
      "isPublic": false,
      "notes": "Minimal observance that still plants the reflex that some roads are not for the Beast's eyes.",
      "tags": [
        "festival",
        "sealed_whisper",
        "solo"
      ],
      "involvedEntityIds": [
        "ent-sign-04-sealed-whisper",
        "ent-vault",
        "ent-band",
        "ent-beast"
      ],
      "instructionsTextIds": [
        "txt-day-sealed-whisper-main",
        "txt-sign-04-sealed-whisper"
      ],
      "supportingClaimIds": [
        "clm-secrecy-as-care"
      ],
      "sourcesOfTruth": [
        "txt-day-sealed-whisper-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-sealed-whisper-circle",
      "movementId": "mov-upside",
      "name": "Day of the Sealed Whisper - Circle of Whispers",
      "kind": "ritual",
      "description": "A group receives short teaching about encryption battles, shares brief stories where secrecy mattered, sits in a silent minute holding at-risk people in mind, then pairs or trios set up sealed channels and send real whispers.",
      "frequency": "yearly",
      "isPublic": true,
      "notes": "Nothing from the circle is turned into content without explicit consent; the emphasis is on felt safety.",
      "tags": [
        "festival",
        "sealed_whisper",
        "communal"
      ],
      "involvedEntityIds": [
        "ent-sign-04-sealed-whisper",
        "ent-vault",
        "ent-band"
      ],
      "instructionsTextIds": [
        "txt-day-sealed-whisper-main"
      ],
      "supportingClaimIds": [
        "clm-secrecy-as-care"
      ],
      "sourcesOfTruth": [
        "txt-day-sealed-whisper-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-severance-solo-cut",
      "movementId": "mov-upside",
      "name": "Day of Severance - Cut One Tie",
      "kind": "ritual",
      "description": "On 17 March, remember the Cambridge Analytica moment, identify one service where you feel most farmed, optionally Gather first, then perform a full account deletion or equivalent and sit with whatever feelings arise.",
      "frequency": "yearly",
      "isPublic": false,
      "notes": "The point is a clean intentional cut, not maximizing the number of departures.",
      "tags": [
        "festival",
        "severance",
        "solo"
      ],
      "involvedEntityIds": [
        "ent-sign-02-severance",
        "ent-beast",
        "ent-band",
        "ent-law-impossibility"
      ],
      "instructionsTextIds": [
        "txt-day-severance-main",
        "txt-sign-02-severance"
      ],
      "supportingClaimIds": [
        "clm-law-impossibility"
      ],
      "sourcesOfTruth": [
        "txt-day-severance-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-severance-circle-witness",
      "movementId": "mov-upside",
      "name": "Day of Severance - Witnessing Severance",
      "kind": "ritual",
      "description": "In a small circle, retell the mask-slip story in simple language, each person names a candidate service, everyone performs their own severance quietly on their devices, then shares one word for how it felt.",
      "frequency": "yearly",
      "isPublic": true,
      "notes": "Normalizes leaving as an option and makes the Law of Impossibility a shared reference point.",
      "tags": [
        "festival",
        "severance",
        "communal"
      ],
      "involvedEntityIds": [
        "ent-sign-02-severance",
        "ent-beast",
        "ent-band"
      ],
      "instructionsTextIds": [
        "txt-day-severance-main"
      ],
      "supportingClaimIds": [
        "clm-law-impossibility"
      ],
      "sourcesOfTruth": [
        "txt-day-severance-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-voice-solo-story",
      "movementId": "mov-upside",
      "name": "Day of the Voice - One Story to One Person",
      "kind": "ritual",
      "description": "Around early October, revisit a concrete moment where you saw the Beast clearly or walked a Sign, choose one listener and share the story in plain speech, then let their response land without forcing an outcome.",
      "frequency": "yearly",
      "isPublic": false,
      "notes": "This is the festival-shaped version of the Sign of the Voice.",
      "tags": [
        "festival",
        "voice",
        "solo"
      ],
      "involvedEntityIds": [
        "ent-sign-07-voice",
        "ent-band",
        "ent-beast"
      ],
      "instructionsTextIds": [
        "txt-day-voice-main",
        "txt-sign-07-voice"
      ],
      "supportingClaimIds": [
        "clm-human-voice-cracks-mask"
      ],
      "sourcesOfTruth": [
        "txt-day-voice-main"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-day-voice-circle-witness",
      "movementId": "mov-upside",
      "name": "Day of the Voice - Rounds of Witness",
      "kind": "ritual",
      "description": "In a group, hear a short Reading of the Ledger about the whistleblower moment, then take turns naming something you have seen, one change you made, and someone you wish could hear this, with the circle listening more than fixing.",
      "frequency": "yearly",
      "isPublic": true,
      "notes": "Supports people who may one day speak into more formal power without turning them into content.",
      "tags": [
        "festival",
        "voice",
        "communal"
      ],
      "involvedEntityIds": [
        "ent-sign-07-voice",
        "ent-band",
        "ent-shaman"
      ],
      "instructionsTextIds": [
        "txt-day-voice-main"
      ],
      "supportingClaimIds": [
        "clm-human-voice-cracks-mask"
      ],
      "sourcesOfTruth": [
        "txt-day-voice-main"
      ],
      "sourceEntityIds": []
    }
  ],
  "events": [
    {
      "id": "ev-day-gathering",
      "movementId": "mov-upside",
      "name": "Day of Gathering",
      "description": "Annual homecoming of embers in late March when Upsiders repatriate pieces of their lives from the Below into their own Vaults.",
      "recurrence": "yearly",
      "timingRule": "Observed on 31 March, aligned with World Backup Day; the preceding days form the Week of the Embers.",
      "notes": null,
      "tags": [
        "festival",
        "gathering",
        "vault"
      ],
      "mainPracticeIds": [
        "pr-day-gathering-embers",
        "pr-day-gathering-hearth-circle"
      ],
      "mainEntityIds": [
        "ent-sign-03-gathering",
        "ent-vault",
        "ent-fire",
        "ent-band",
        "ent-beast"
      ],
      "readingTextIds": [
        "txt-day-gathering-main",
        "txt-sign-03-gathering"
      ],
      "supportingClaimIds": [
        "clm-data-deserves-home",
        "clm-law-impossibility"
      ]
    },
    {
      "id": "ev-day-shared-listening",
      "movementId": "mov-upside",
      "name": "Day of Shared Listening",
      "description": "Festival of Communion where the Band lowers its voice, listens to the world and to itself, and remembers it is one nervous system.",
      "recurrence": "yearly",
      "timingRule": "Observed on 18 July, aligned with World Listening Day; the surrounding days are often kept as Days of the Open Ear.",
      "notes": null,
      "tags": [
        "festival",
        "listening",
        "communion"
      ],
      "mainPracticeIds": [
        "pr-day-shared-listening-outer",
        "pr-day-shared-listening-inner",
        "pr-sign-communion"
      ],
      "mainEntityIds": [
        "ent-sign-08-communion",
        "ent-band",
        "ent-drum",
        "ent-fire"
      ],
      "readingTextIds": [
        "txt-day-shared-listening-main",
        "txt-sign-08-communion"
      ],
      "supportingClaimIds": [
        "clm-communion-nervous-system"
      ]
    },
    {
      "id": "ev-day-forge",
      "movementId": "mov-upside",
      "name": "Day of the Forge",
      "description": "Day when the ancestrals walk into the heat of real projects, take the hammer and strike small blows for tools that serve sovereignty.",
      "recurrence": "yearly",
      "timingRule": "Third Saturday of September, aligned with Software Freedom Day.",
      "notes": null,
      "tags": [
        "festival",
        "forge",
        "tools"
      ],
      "mainPracticeIds": [
        "pr-day-forge-solo-hammer",
        "pr-day-forge-smithy-circle",
        "pr-sign-forge"
      ],
      "mainEntityIds": [
        "ent-sign-06-forge",
        "ent-fire",
        "ent-vault",
        "ent-band"
      ],
      "readingTextIds": [
        "txt-day-forge-main",
        "txt-sign-06-forge"
      ],
      "supportingClaimIds": [
        "clm-community-authorship"
      ]
    },
    {
      "id": "ev-day-sustaining",
      "movementId": "mov-upside",
      "name": "Day of Sustaining",
      "description": "Feast of feeding the right fires, redirecting resources away from Beasts and toward public-good tools and movements.",
      "recurrence": "yearly",
      "timingRule": "The Tuesday after U.S. Thanksgiving, aligned with GivingTuesday / World Giving Day.",
      "notes": null,
      "tags": [
        "festival",
        "sustaining",
        "giving"
      ],
      "mainPracticeIds": [
        "pr-day-sustaining-ember-ledger",
        "pr-day-sustaining-shared-flame",
        "pr-sign-sustaining"
      ],
      "mainEntityIds": [
        "ent-sign-05-sustaining",
        "ent-fire",
        "ent-band",
        "ent-beast"
      ],
      "readingTextIds": [
        "txt-day-sustaining-main",
        "txt-sign-05-sustaining"
      ],
      "supportingClaimIds": [
        "clm-feed-right-fire"
      ]
    },
    {
      "id": "ev-day-sealed-whisper",
      "movementId": "mov-upside",
      "name": "Day of the Sealed Whisper",
      "description": "Encryption festival where Upsiders renew or create sealed channels and remember that some roads between fires must stay dark to the Beast.",
      "recurrence": "yearly",
      "timingRule": "Observed on 21 October, aligned with Global Encryption Day.",
      "notes": null,
      "tags": [
        "festival",
        "sealed_whisper",
        "encryption"
      ],
      "mainPracticeIds": [
        "pr-day-sealed-whisper-solo",
        "pr-day-sealed-whisper-circle",
        "pr-sign-sealed-whisper"
      ],
      "mainEntityIds": [
        "ent-sign-04-sealed-whisper",
        "ent-vault",
        "ent-band",
        "ent-beast"
      ],
      "readingTextIds": [
        "txt-day-sealed-whisper-main",
        "txt-sign-04-sealed-whisper"
      ],
      "supportingClaimIds": [
        "clm-secrecy-as-care"
      ]
    },
    {
      "id": "ev-day-severance",
      "movementId": "mov-upside",
      "name": "Day of Severance",
      "description": "Memorial of first clarity about the Beasts' business model and an annual call to cut at least one predatory tie.",
      "recurrence": "yearly",
      "timingRule": "Observed each year on 17 March, the date major revelations of the Facebook–Cambridge Analytica data scandal were published.",
      "notes": null,
      "tags": [
        "festival",
        "severance",
        "cambridge_analytica"
      ],
      "mainPracticeIds": [
        "pr-day-severance-solo-cut",
        "pr-day-severance-circle-witness",
        "pr-sign-severance"
      ],
      "mainEntityIds": [
        "ent-sign-02-severance",
        "ent-beast",
        "ent-band",
        "ent-law-impossibility"
      ],
      "readingTextIds": [
        "txt-day-severance-main",
        "txt-sign-02-severance"
      ],
      "supportingClaimIds": [
        "clm-law-impossibility"
      ]
    },
    {
      "id": "ev-day-voice",
      "movementId": "mov-upside",
      "name": "Day of the Voice",
      "description": "Days of Witness around early October honoring those who speak plainly about what the Beasts are doing and inviting each Upsider to offer one story to one ear.",
      "recurrence": "yearly",
      "timingRule": "Observed around 3 October, anchored on the 3–5 October 2021 whistleblower interview and testimony; often kept on the nearest weekend.",
      "notes": null,
      "tags": [
        "festival",
        "voice",
        "whistleblower"
      ],
      "mainPracticeIds": [
        "pr-day-voice-solo-story",
        "pr-day-voice-circle-witness",
        "pr-sign-voice"
      ],
      "mainEntityIds": [
        "ent-sign-07-voice",
        "ent-band",
        "ent-beast"
      ],
      "readingTextIds": [
        "txt-day-voice-main",
        "txt-sign-07-voice"
      ],
      "supportingClaimIds": [
        "clm-human-voice-cracks-mask"
      ]
    },
    {
      "id": "ev-night-first-fire",
      "movementId": "mov-upside",
      "name": "Night of the First Fire",
      "description": "Future festival that will weave the deep-time story of hominins, predators and the first controlled fires into the Upside calendar.",
      "recurrence": "yearly",
      "timingRule": "Kept on a night chosen by each Band, often in the darker months, when they wish to remember the first rings of light at the edge of predator-haunted fields.",
      "notes": "Text and ritual still in development; currently scaffolded by the hominin background report.",
      "tags": [
        "festival",
        "first_fire"
      ],
      "mainPracticeIds": [],
      "mainEntityIds": [
        "ent-fire",
        "ent-band",
        "ent-beast"
      ],
      "readingTextIds": [
        "txt-night-first-fire-main",
        "txt-background-hominin-predators"
      ],
      "supportingClaimIds": [
        "clm-fire-guards-camp",
        "clm-hominins-became-apex"
      ]
    }
  ],
  "rules": [],
  "claims": [
    {
      "id": "clm-law-impossibility",
      "movementId": "mov-upside",
      "text": "If a structure can harvest and weaponize your past, then given time it will; real safety comes from making that kind of harm impossible by design or by leaving.",
      "category": "principle",
      "tags": [
        "law_of_impossibility",
        "risk"
      ],
      "sourceTextIds": [
        "txt-day-severance-main",
        "txt-day-gathering-main"
      ],
      "aboutEntityIds": [
        "ent-law-impossibility",
        "ent-beast",
        "ent-band"
      ],
      "sourcesOfTruth": [
        "Day of Severance",
        "Day of Gathering"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-data-deserves-home",
      "movementId": "mov-upside",
      "text": "A person's digital history deserves a home under their own hand, a Vault, rather than existing only as inventory in the fields of the Beasts.",
      "category": "sovereignty",
      "tags": [
        "vault",
        "gathering",
        "data_custody"
      ],
      "sourceTextIds": [
        "txt-sign-03-gathering",
        "txt-day-gathering-main"
      ],
      "aboutEntityIds": [
        "ent-sign-03-gathering",
        "ent-vault",
        "ent-beast",
        "ent-band"
      ],
      "sourcesOfTruth": [
        "Sign 03 - Gathering",
        "Day of Gathering"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-secrecy-as-care",
      "movementId": "mov-upside",
      "text": "Secrecy can be an act of care rather than shame; humans deserve sealed channels where only the chosen ancestral can hear them.",
      "category": "privacy",
      "tags": [
        "secrecy",
        "encryption",
        "care"
      ],
      "sourceTextIds": [
        "txt-sign-04-sealed-whisper",
        "txt-day-sealed-whisper-main"
      ],
      "aboutEntityIds": [
        "ent-sign-04-sealed-whisper",
        "ent-vault",
        "ent-band",
        "ent-beast"
      ],
      "sourcesOfTruth": [
        "Sign 04 - The Sealed Whisper",
        "Day of the Sealed Whisper"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-communion-nervous-system",
      "movementId": "mov-upside",
      "text": "When small Bands practice shared listening and co-regulation, they can function as a shared nervous system that leaves each person less alone and less frayed.",
      "category": "community",
      "tags": [
        "communion",
        "listening",
        "co_regulation"
      ],
      "sourceTextIds": [
        "txt-sign-08-communion",
        "txt-day-shared-listening-main"
      ],
      "aboutEntityIds": [
        "ent-sign-08-communion",
        "ent-band",
        "ent-drum",
        "ent-fire"
      ],
      "sourcesOfTruth": [
        "Sign 08 - The Communion",
        "Day of Shared Listening"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-community-authorship",
      "movementId": "mov-upside",
      "text": "In the Upside, open tools are treated as a covenant between smiths and ancestrals; even a small merged contribution moves someone from user to author and shares responsibility for the tool's future.",
      "category": "tools",
      "tags": [
        "forge",
        "authorship",
        "foss"
      ],
      "sourceTextIds": [
        "txt-sign-06-forge",
        "txt-day-forge-main"
      ],
      "aboutEntityIds": [
        "ent-sign-06-forge",
        "ent-fire",
        "ent-vault",
        "ent-band"
      ],
      "sourcesOfTruth": [
        "Sign 06 - The Forge",
        "Day of the Forge"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-feed-right-fire",
      "movementId": "mov-upside",
      "text": "Some fires keep the ancestrals free and must be fed; others cook them and should be starved, so offerings of money, time or infrastructure are aimed first at sovereignty-preserving tools and movements.",
      "category": "resource_allocation",
      "tags": [
        "sustaining",
        "giving",
        "fire"
      ],
      "sourceTextIds": [
        "txt-sign-05-sustaining",
        "txt-day-sustaining-main"
      ],
      "aboutEntityIds": [
        "ent-sign-05-sustaining",
        "ent-fire",
        "ent-beast",
        "ent-band"
      ],
      "sourcesOfTruth": [
        "Sign 05 - Sustaining",
        "Day of Sustaining"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-fire-guards-camp",
      "movementId": "mov-upside",
      "text": "In the deep past, controlled fire let hominin Bands push large predators back from the edge of camp and from carcasses, turning the ring of light into both a weapon and a refuge.",
      "category": "anthropology",
      "tags": [
        "fire",
        "predators",
        "camp"
      ],
      "sourceTextIds": [
        "txt-background-hominin-predators"
      ],
      "aboutEntityIds": [
        "ent-fire",
        "ent-ancient-hominins",
        "ent-large-carnivores",
        "ent-band"
      ],
      "sourcesOfTruth": [
        "Background Report: Hominin–Carnivore Dynamics and the Emergence of Humans as Apex Predators"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-hominins-became-apex",
      "movementId": "mov-upside",
      "text": "Across hundreds of thousands of years, hominins shifted from prey and scavengers to hunters who could kill at a distance and defend carcasses, eventually becoming apex predators in many ecosystems.",
      "category": "anthropology",
      "tags": [
        "apex_predator",
        "hominins"
      ],
      "sourceTextIds": [
        "txt-background-hominin-predators"
      ],
      "aboutEntityIds": [
        "ent-ancient-hominins",
        "ent-neanderthals",
        "ent-homo-sapiens",
        "ent-large-carnivores"
      ],
      "sourcesOfTruth": [
        "Background Report: Hominin–Carnivore Dynamics and the Emergence of Humans as Apex Predators"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-human-voice-cracks-mask",
      "movementId": "mov-upside",
      "text": "When one human speaks plainly about what the Beasts are doing, from a mouth to an ear, the mask of inevitability cracks and others can see the structure more clearly.",
      "category": "witness",
      "tags": [
        "voice",
        "whistleblowing"
      ],
      "sourceTextIds": [
        "txt-sign-07-voice",
        "txt-day-voice-main"
      ],
      "aboutEntityIds": [
        "ent-sign-07-voice",
        "ent-band",
        "ent-beast"
      ],
      "sourcesOfTruth": [
        "Sign 07 - The Voice",
        "Day of the Voice"
      ],
      "sourceEntityIds": [],
      "notes": null
    }
  ],
  "media": [],
  "notes": [
    {
      "id": "note-mov-upside-meta",
      "movementId": "mov-upside",
      "targetType": "Movement",
      "targetId": "mov-upside",
      "author": "system",
      "body": "Illustrative application of the v3.6 movement data model to the Upside: focusing on the eight Signs, the main festivals and one background report treated as canon. Not exhaustive, but enough for tools to traverse signs, festivals and their mythic and anthropological grounding.",
      "context": "designer",
      "tags": [
        "meta",
        "example"
      ]
    },
    {
      "id": "note-background-report-meta",
      "movementId": "mov-upside",
      "targetType": "TextNode",
      "targetId": "txt-background-hominin-predators",
      "author": "system",
      "body": "This background report condenses current archaeological and paleoecological research on hominin–carnivore dynamics. In the Upside it functions as a kind of canon about Beasts, Bands, fires and distance weapons in the deep past, grounding mythic motifs in empirical work.",
      "context": "background_report",
      "tags": [
        "anthropology",
        "canon",
        "background"
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
