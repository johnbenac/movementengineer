(function () {
const dataset = {
  "version": "3.5",
  "movements": [
    {
      "id": "mov-catholic",
      "name": "Roman Catholic Church",
      "shortName": "Catholic",
      "summary": "The Roman Catholic Church is a worldwide Christian church that teaches one God in three persons, centered on Jesus Christ, the sacraments, and a liturgical life ordered around the Eucharist.",
      "notes": null,
      "tags": [
        "christian",
        "catholic",
        "sacramental",
        "liturgical"
      ]
    }
  ],
  "textCollections": [
    {
      "id": "tc-catholic-bible",
      "movementId": "mov-catholic",
      "name": "Sacred Canon (Bible)",
      "description": "The collection of biblical books recognized and used in the Catholic Church.",
      "tags": [
        "canon",
        "bible"
      ],
      "rootTextIds": [
        "txt-bible-root"
      ]
    },
    {
      "id": "tc-catholic-catechism",
      "movementId": "mov-catholic",
      "name": "Catechism and Creeds",
      "description": "Key doctrinal summaries such as the Catechism of the Catholic Church and the Nicene Creed.",
      "tags": [
        "catechism",
        "creed",
        "doctrine"
      ],
      "rootTextIds": [
        "txt-catechism-root",
        "txt-nicene-creed"
      ]
    }
  ],
  "texts": [
    {
      "id": "txt-bible-root",
      "movementId": "mov-catholic",
      "parentId": null,
      "level": "work",
      "title": "The Holy Bible",
      "label": "Bible",
      "content": null,
      "mainFunction": null,
      "tags": [
        "canon",
        "collection"
      ],
      "mentionsEntityIds": [
        "ent-god-trinity",
        "ent-jesus-christ",
        "ent-holy-spirit",
        "ent-virgin-mary"
      ]
    },
    {
      "id": "txt-nt-gospels",
      "movementId": "mov-catholic",
      "parentId": "txt-bible-root",
      "level": "section",
      "title": "Gospels",
      "label": "New Testament Gospels",
      "content": null,
      "mainFunction": "story",
      "tags": [
        "gospels",
        "story"
      ],
      "mentionsEntityIds": [
        "ent-jesus-christ",
        "ent-virgin-mary"
      ]
    },
    {
      "id": "txt-luke-last-supper",
      "movementId": "mov-catholic",
      "parentId": "txt-nt-gospels",
      "level": "passage",
      "title": "Institution of the Eucharist (summary)",
      "label": "Luke Last Supper Summary",
      "content": "At a final meal with his disciples, Jesus blesses bread and wine and speaks of them as his body and blood given for many.",
      "mainFunction": "story",
      "tags": [
        "last_supper",
        "eucharist"
      ],
      "mentionsEntityIds": [
        "ent-jesus-christ",
        "ent-eucharist-sacrament",
        "ent-eucharist-host"
      ]
    },
    {
      "id": "txt-luke-last-supper-line1",
      "movementId": "mov-catholic",
      "parentId": "txt-luke-last-supper",
      "level": "line",
      "title": "Words over the bread (paraphrase)",
      "label": "Last Supper Bread Line",
      "content": "Jesus takes bread, gives thanks, breaks it, and shares it as a sign of his body given for his followers.",
      "mainFunction": "story",
      "tags": [
        "eucharist",
        "paraphrase"
      ],
      "mentionsEntityIds": [
        "ent-jesus-christ",
        "ent-eucharist-host"
      ]
    },
    {
      "id": "txt-catechism-root",
      "movementId": "mov-catholic",
      "parentId": null,
      "level": "work",
      "title": "Catechism of the Catholic Church (summary)",
      "label": "Catechism",
      "content": null,
      "mainFunction": "teaching",
      "tags": [
        "catechism",
        "doctrine"
      ],
      "mentionsEntityIds": [
        "ent-god-trinity",
        "ent-church-universal",
        "ent-virgin-mary",
        "ent-eucharist-sacrament"
      ]
    },
    {
      "id": "txt-catechism-trinity",
      "movementId": "mov-catholic",
      "parentId": "txt-catechism-root",
      "level": "passage",
      "title": "On the Trinity (summary)",
      "label": "Catechism Trinity Summary",
      "content": "The Church teaches that the mystery of the Most Holy Trinity is the central mystery of the Christian faith and life: one God in three distinct persons.",
      "mainFunction": "teaching",
      "tags": [
        "trinity",
        "doctrine"
      ],
      "mentionsEntityIds": [
        "ent-god-trinity",
        "ent-god-father",
        "ent-god-son",
        "ent-holy-spirit"
      ]
    },
    {
      "id": "txt-catechism-eucharist",
      "movementId": "mov-catholic",
      "parentId": "txt-catechism-root",
      "level": "passage",
      "title": "On the Eucharist (summary)",
      "label": "Catechism Eucharist Summary",
      "content": "The Eucharist is the sacrament in which bread and wine, consecrated by a priest, become the body and blood of Christ, the source and summit of the Christian life.",
      "mainFunction": "teaching",
      "tags": [
        "eucharist",
        "sacrament"
      ],
      "mentionsEntityIds": [
        "ent-eucharist-sacrament",
        "ent-eucharist-host",
        "ent-jesus-christ"
      ]
    },
    {
      "id": "txt-nicene-creed",
      "movementId": "mov-catholic",
      "parentId": null,
      "level": "work",
      "title": "Nicene Creed (summary)",
      "label": "Nicene Creed",
      "content": "A structured statement of faith in one God, the Father almighty, in Jesus Christ his only Son, in the Holy Spirit, the Church, baptism, and the life of the world to come.",
      "mainFunction": "teaching",
      "tags": [
        "creed",
        "liturgy"
      ],
      "mentionsEntityIds": [
        "ent-god-father",
        "ent-god-son",
        "ent-holy-spirit",
        "ent-church-universal"
      ]
    },
    {
      "id": "txt-our-father",
      "movementId": "mov-catholic",
      "parentId": null,
      "level": "work",
      "title": "The Lord's Prayer (Our Father) paraphrase",
      "label": "Our Father",
      "content": "A prayer taught by Jesus that addresses God as Father, asks for the coming of the kingdom, daily bread, forgiveness, and protection from evil.",
      "mainFunction": "prayer_or_song",
      "tags": [
        "prayer",
        "lord_prayer"
      ],
      "mentionsEntityIds": [
        "ent-god-father",
        "ent-jesus-christ"
      ]
    },
    {
      "id": "txt-confession-instructions",
      "movementId": "mov-catholic",
      "parentId": null,
      "level": "passage",
      "title": "How to Receive the Sacrament of Reconciliation",
      "label": "Confession Instructions",
      "content": "Brief steps: examine your conscience, express sorrow for sins, confess to a priest, receive absolution, and do the given penance.",
      "mainFunction": "instructions",
      "tags": [
        "confession",
        "reconciliation",
        "instructions"
      ],
      "mentionsEntityIds": [
        "ent-church-universal",
        "ent-parish-local"
      ]
    },
    {
      "id": "txt-saint-francis-story",
      "movementId": "mov-catholic",
      "parentId": null,
      "level": "passage",
      "title": "Story of Saint Francis of Assisi (short summary)",
      "label": "St Francis Story",
      "content": "A brief narrative of Francis of Assisi, who embraced poverty and proclaimed peace, becoming an example of joyful discipleship.",
      "mainFunction": "story",
      "tags": [
        "saint",
        "francis",
        "example"
      ],
      "mentionsEntityIds": [
        "ent-saint-francis"
      ]
    },
    {
      "id": "txt-commentary-on-mary",
      "movementId": "mov-catholic",
      "parentId": "txt-catechism-root",
      "level": "passage",
      "title": "On Mary, Mother of God (commentary summary)",
      "label": "Mary Commentary",
      "content": "An explanatory note on the Catholic belief that Mary is Mother of God and a model of faith and charity for the Church.",
      "mainFunction": "commentary",
      "tags": [
        "mary",
        "commentary"
      ],
      "mentionsEntityIds": [
        "ent-virgin-mary",
        "ent-jesus-christ",
        "ent-church-universal"
      ]
    },
    {
      "id": "txt-moral-rule-summary",
      "movementId": "mov-catholic",
      "parentId": null,
      "level": "passage",
      "title": "Summary of Christian Moral Life",
      "label": "Moral Summary",
      "content": "Love of God and neighbor is the heart of the moral law. The Ten Commandments and the teachings of Jesus guide Catholics in conscience and action.",
      "mainFunction": "rule",
      "tags": [
        "morality",
        "commandments"
      ],
      "mentionsEntityIds": [
        "ent-god-trinity",
        "ent-church-universal"
      ]
    }
  ],
  "entities": [
    {
      "id": "ent-god-trinity",
      "movementId": "mov-catholic",
      "name": "The Holy Trinity",
      "kind": "being",
      "summary": "One God in three distinct persons: Father, Son, and Holy Spirit, the central mystery of Catholic faith and life.",
      "notes": null,
      "tags": [
        "god",
        "trinity"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church",
        "Nicene Creed"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ]
    },
    {
      "id": "ent-god-father",
      "movementId": "mov-catholic",
      "name": "God the Father",
      "kind": "being",
      "summary": "The first person of the Trinity, creator and source of all that exists.",
      "notes": null,
      "tags": [
        "god",
        "father"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "ent-god-son",
      "movementId": "mov-catholic",
      "name": "God the Son",
      "kind": "being",
      "summary": "The second person of the Trinity, who became incarnate as Jesus Christ.",
      "notes": null,
      "tags": [
        "god",
        "son"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "ent-holy-spirit",
      "movementId": "mov-catholic",
      "name": "The Holy Spirit",
      "kind": "being",
      "summary": "The third person of the Trinity, who gives life to the Church and dwells in believers.",
      "notes": null,
      "tags": [
        "god",
        "spirit"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "ent-jesus-christ",
      "movementId": "mov-catholic",
      "name": "Jesus Christ",
      "kind": "being",
      "summary": "The incarnate Son of God, fully divine and fully human, whose life, death, and resurrection are at the center of Catholic faith.",
      "notes": null,
      "tags": [
        "jesus",
        "christ"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "ent-virgin-mary",
      "movementId": "mov-catholic",
      "name": "Mary, Mother of Jesus",
      "kind": "being",
      "summary": "The mother of Jesus, honored as Mother of God and model disciple in Catholic tradition.",
      "notes": null,
      "tags": [
        "mary",
        "saint"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "ent-saint-francis",
      "movementId": "mov-catholic",
      "name": "Saint Francis of Assisi",
      "kind": "being",
      "summary": "A medieval Catholic saint known for his embrace of poverty and love of creation.",
      "notes": null,
      "tags": [
        "saint",
        "francis"
      ],
      "sourcesOfTruth": [
        "hagiography",
        "tradition"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-church-universal",
      "movementId": "mov-catholic",
      "name": "The Catholic Church",
      "kind": "idea",
      "summary": "The worldwide community of believers united in faith, sacraments, and governance under the Pope and bishops.",
      "notes": null,
      "tags": [
        "church",
        "community"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ]
    },
    {
      "id": "ent-parish-local",
      "movementId": "mov-catholic",
      "name": "Local Parish",
      "kind": "being",
      "summary": "A local community of Catholics gathered around a church building under the care of a pastor.",
      "notes": null,
      "tags": [
        "parish",
        "local_church"
      ],
      "sourcesOfTruth": [
        "Canon law",
        "pastoral practice"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-diocese",
      "movementId": "mov-catholic",
      "name": "Diocese",
      "kind": "being",
      "summary": "A regional grouping of parishes under the leadership of a bishop.",
      "notes": null,
      "tags": [
        "diocese",
        "jurisdiction"
      ],
      "sourcesOfTruth": [
        "Canon law"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-pope-office",
      "movementId": "mov-catholic",
      "name": "The Pope",
      "kind": "being",
      "summary": "The bishop of Rome and visible head of the Catholic Church on earth.",
      "notes": null,
      "tags": [
        "pope",
        "office"
      ],
      "sourcesOfTruth": [
        "Catholic tradition",
        "Canon law"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-heaven",
      "movementId": "mov-catholic",
      "name": "Heaven",
      "kind": "place",
      "summary": "The state of eternal life in union with God and the saints.",
      "notes": null,
      "tags": [
        "afterlife",
        "heaven"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "ent-hell",
      "movementId": "mov-catholic",
      "name": "Hell",
      "kind": "place",
      "summary": "The state of definitive self-exclusion from communion with God and the blessed.",
      "notes": null,
      "tags": [
        "afterlife",
        "hell"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "ent-purgatory",
      "movementId": "mov-catholic",
      "name": "Purgatory",
      "kind": "place",
      "summary": "A state of purification for those who die in God's grace but are not yet fully perfected.",
      "notes": null,
      "tags": [
        "afterlife",
        "purgatory"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ]
    },
    {
      "id": "ent-bible-book",
      "movementId": "mov-catholic",
      "name": "Sacred Canon (Bible)",
      "kind": "object",
      "summary": "The collection of inspired writings of the Old and New Testaments used in Catholic worship and teaching.",
      "notes": null,
      "tags": [
        "bible",
        "canon"
      ],
      "sourcesOfTruth": [
        "Catholic tradition"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-catechism",
      "movementId": "mov-catholic",
      "name": "Catechism of the Catholic Church",
      "kind": "object",
      "summary": "A reference text that systematically presents Catholic doctrine, morals, and worship.",
      "notes": null,
      "tags": [
        "catechism",
        "doctrine"
      ],
      "sourcesOfTruth": [
        "Magisterium of the Catholic Church"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-eucharist-sacrament",
      "movementId": "mov-catholic",
      "name": "Sacrament of the Eucharist",
      "kind": "idea",
      "summary": "The sacrament in which Christ becomes present under the appearances of bread and wine and the faithful receive his body and blood.",
      "notes": null,
      "tags": [
        "sacrament",
        "eucharist"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "ent-eucharist-host",
      "movementId": "mov-catholic",
      "name": "Consecrated Host",
      "kind": "object",
      "summary": "The consecrated bread which Catholics believe is the body of Christ in the Eucharist.",
      "notes": null,
      "tags": [
        "eucharist",
        "host"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ]
    },
    {
      "id": "ent-altar",
      "movementId": "mov-catholic",
      "name": "Altar",
      "kind": "object",
      "summary": "The table in a church on which the Eucharistic sacrifice is offered.",
      "notes": null,
      "tags": [
        "altar",
        "church_furnishing"
      ],
      "sourcesOfTruth": [
        "liturgical books"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-lent-season",
      "movementId": "mov-catholic",
      "name": "Lent",
      "kind": "idea",
      "summary": "A liturgical season of forty days of prayer, fasting, and almsgiving in preparation for Easter.",
      "notes": null,
      "tags": [
        "lent",
        "season"
      ],
      "sourcesOfTruth": [
        "liturgical tradition"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-easter-sunday",
      "movementId": "mov-catholic",
      "name": "Easter Sunday",
      "kind": "idea",
      "summary": "The principal feast of the liturgical year, celebrating the resurrection of Jesus from the dead.",
      "notes": null,
      "tags": [
        "easter",
        "feast"
      ],
      "sourcesOfTruth": [
        "liturgical tradition"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-crucifix-object",
      "movementId": "mov-catholic",
      "name": "Crucifix",
      "kind": "object",
      "summary": "A cross bearing the figure of the crucified Christ, used as a devotional and liturgical symbol.",
      "notes": null,
      "tags": [
        "crucifix",
        "symbol"
      ],
      "sourcesOfTruth": [
        "devotional tradition"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "ent-rosary-object",
      "movementId": "mov-catholic",
      "name": "Rosary Beads",
      "kind": "object",
      "summary": "A string of beads used to count prayers in the devotion known as the Rosary.",
      "notes": null,
      "tags": [
        "rosary",
        "devotion"
      ],
      "sourcesOfTruth": [
        "devotional tradition"
      ],
      "sourceEntityIds": []
    }
  ],
  "practices": [
    {
      "id": "pr-sunday-mass",
      "movementId": "mov-catholic",
      "name": "Sunday Mass",
      "kind": "ritual",
      "description": "The main weekly gathering where Catholics celebrate the Eucharist, hear canonical readings, and pray together.",
      "frequency": "weekly",
      "isPublic": true,
      "notes": null,
      "tags": [
        "mass",
        "eucharist",
        "worship"
      ],
      "involvedEntityIds": [
        "ent-god-trinity",
        "ent-jesus-christ",
        "ent-eucharist-sacrament",
        "ent-altar",
        "ent-parish-local"
      ],
      "instructionsTextIds": [
        "txt-catechism-eucharist"
      ],
      "supportingClaimIds": [
        "clm-real-presence-eucharist",
        "clm-sunday-obligation"
      ],
      "sourcesOfTruth": [
        "Bible",
        "liturgical books",
        "Canon law"
      ],
      "sourceEntityIds": [
        "ent-bible-book",
        "ent-catechism"
      ]
    },
    {
      "id": "pr-daily-mass",
      "movementId": "mov-catholic",
      "name": "Daily Mass",
      "kind": "ritual",
      "description": "A weekday celebration of the Eucharist for those who are able to attend.",
      "frequency": "daily",
      "isPublic": true,
      "notes": null,
      "tags": [
        "mass",
        "eucharist"
      ],
      "involvedEntityIds": [
        "ent-god-trinity",
        "ent-jesus-christ",
        "ent-eucharist-sacrament",
        "ent-altar"
      ],
      "instructionsTextIds": [
        "txt-catechism-eucharist"
      ],
      "supportingClaimIds": [
        "clm-real-presence-eucharist"
      ],
      "sourcesOfTruth": [
        "liturgical books"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-reconciliation",
      "movementId": "mov-catholic",
      "name": "Sacrament of Reconciliation (Confession)",
      "kind": "ritual",
      "description": "The sacrament in which Catholics confess sins to a priest, receive absolution, and perform a penance.",
      "frequency": "other",
      "isPublic": false,
      "notes": "Celebrated individually as needed; some parishes have scheduled times.",
      "tags": [
        "confession",
        "penance",
        "healing"
      ],
      "involvedEntityIds": [
        "ent-church-universal",
        "ent-parish-local"
      ],
      "instructionsTextIds": [
        "txt-confession-instructions"
      ],
      "supportingClaimIds": [
        "clm-grace-participation"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ]
    },
    {
      "id": "pr-daily-rosary",
      "movementId": "mov-catholic",
      "name": "Daily Rosary",
      "kind": "discipline",
      "description": "A devotional practice of meditative prayer using rosary beads, reflecting on events in the life of Christ and Mary.",
      "frequency": "daily",
      "isPublic": false,
      "notes": null,
      "tags": [
        "rosary",
        "devotion"
      ],
      "involvedEntityIds": [
        "ent-virgin-mary",
        "ent-rosary-object",
        "ent-crucifix-object"
      ],
      "instructionsTextIds": [],
      "supportingClaimIds": [
        "clm-communion-of-saints"
      ],
      "sourcesOfTruth": [
        "devotional tradition"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-lenten-fasting",
      "movementId": "mov-catholic",
      "name": "Lenten Fasting and Abstinence",
      "kind": "discipline",
      "description": "Fasting and abstaining from meat on certain days during Lent as an act of penance.",
      "frequency": "yearly",
      "isPublic": true,
      "notes": "Exact rules vary by region and age.",
      "tags": [
        "lent",
        "fasting",
        "abstinence"
      ],
      "involvedEntityIds": [
        "ent-lent-season"
      ],
      "instructionsTextIds": [],
      "supportingClaimIds": [
        "clm-lent-penance"
      ],
      "sourcesOfTruth": [
        "Canon law",
        "bishops' conference guidelines"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "pr-charity-service",
      "movementId": "mov-catholic",
      "name": "Acts of Charity and Service",
      "kind": "service",
      "description": "Helping the poor, visiting the sick, and serving the community as expressions of love of neighbor.",
      "frequency": "other",
      "isPublic": true,
      "notes": null,
      "tags": [
        "charity",
        "service"
      ],
      "involvedEntityIds": [
        "ent-saint-francis",
        "ent-parish-local"
      ],
      "instructionsTextIds": [],
      "supportingClaimIds": [
        "clm-grace-participation"
      ],
      "sourcesOfTruth": [
        "Bible",
        "Catholic social teaching"
      ],
      "sourceEntityIds": [
        "ent-bible-book"
      ]
    },
    {
      "id": "pr-bible-study-group",
      "movementId": "mov-catholic",
      "name": "Parish Bible Study",
      "kind": "study",
      "description": "A group that meets regularly to read and reflect on canon and Church teaching.",
      "frequency": "monthly",
      "isPublic": true,
      "notes": null,
      "tags": [
        "study",
        "canon"
      ],
      "involvedEntityIds": [
        "ent-bible-book",
        "ent-catechism",
        "ent-parish-local"
      ],
      "instructionsTextIds": [],
      "supportingClaimIds": [
        "clm-grace-participation"
      ],
      "sourcesOfTruth": [
        "pastoral practice"
      ],
      "sourceEntityIds": []
    }
  ],
  "events": [
    {
      "id": "ev-sunday-mass",
      "movementId": "mov-catholic",
      "name": "Sunday Mass at Parish",
      "description": "Weekly parish celebration of the Eucharist on Sunday, the day of the Lord's resurrection.",
      "recurrence": "weekly",
      "timingRule": "Every Sunday, typically in the morning, at times set by the parish.",
      "notes": null,
      "tags": [
        "mass",
        "sunday",
        "parish"
      ],
      "mainPracticeIds": [
        "pr-sunday-mass"
      ],
      "mainEntityIds": [
        "ent-parish-local",
        "ent-eucharist-sacrament"
      ],
      "readingTextIds": [
        "txt-bible-root",
        "txt-nt-gospels",
        "txt-nicene-creed"
      ],
      "supportingClaimIds": [
        "clm-sunday-obligation"
      ]
    },
    {
      "id": "ev-daily-mass",
      "movementId": "mov-catholic",
      "name": "Daily Mass",
      "description": "Daily celebration of the Eucharist in some parishes or communities.",
      "recurrence": "daily",
      "timingRule": "On most weekdays, at times set by the parish.",
      "notes": null,
      "tags": [
        "mass",
        "daily"
      ],
      "mainPracticeIds": [
        "pr-daily-mass"
      ],
      "mainEntityIds": [
        "ent-parish-local",
        "ent-eucharist-sacrament"
      ],
      "readingTextIds": [
        "txt-bible-root"
      ],
      "supportingClaimIds": [
        "clm-real-presence-eucharist"
      ]
    },
    {
      "id": "ev-easter-sunday",
      "movementId": "mov-catholic",
      "name": "Easter Sunday",
      "description": "The chief feast of the Church year, celebrating the resurrection of Jesus.",
      "recurrence": "yearly",
      "timingRule": "The Sunday after the first full moon following the northern spring equinox.",
      "notes": null,
      "tags": [
        "easter",
        "feast"
      ],
      "mainPracticeIds": [
        "pr-sunday-mass"
      ],
      "mainEntityIds": [
        "ent-jesus-christ",
        "ent-easter-sunday"
      ],
      "readingTextIds": [
        "txt-nt-gospels"
      ],
      "supportingClaimIds": [
        "clm-trinity-central"
      ]
    },
    {
      "id": "ev-christmas-day",
      "movementId": "mov-catholic",
      "name": "Christmas Day",
      "description": "Feast celebrating the birth of Jesus Christ.",
      "recurrence": "yearly",
      "timingRule": "December 25 each year.",
      "notes": null,
      "tags": [
        "christmas",
        "feast"
      ],
      "mainPracticeIds": [
        "pr-sunday-mass"
      ],
      "mainEntityIds": [
        "ent-jesus-christ",
        "ent-virgin-mary"
      ],
      "readingTextIds": [
        "txt-nt-gospels",
        "txt-commentary-on-mary"
      ],
      "supportingClaimIds": [
        "clm-mary-mother-of-god"
      ]
    },
    {
      "id": "ev-ash-wednesday",
      "movementId": "mov-catholic",
      "name": "Ash Wednesday",
      "description": "The first day of Lent, marked by receiving ashes on the forehead as a sign of repentance.",
      "recurrence": "yearly",
      "timingRule": "46 days before Easter Sunday.",
      "notes": null,
      "tags": [
        "lent",
        "penance"
      ],
      "mainPracticeIds": [
        "pr-lenten-fasting"
      ],
      "mainEntityIds": [
        "ent-lent-season"
      ],
      "readingTextIds": [
        "txt-moral-rule-summary"
      ],
      "supportingClaimIds": [
        "clm-lent-penance"
      ]
    },
    {
      "id": "ev-first-friday-devotion",
      "movementId": "mov-catholic",
      "name": "First Friday Devotion",
      "description": "Monthly devotion to the Sacred Heart of Jesus, often including Mass and adoration on the first Friday of each month.",
      "recurrence": "monthly",
      "timingRule": "First Friday of each month.",
      "notes": null,
      "tags": [
        "devotion",
        "sacred_heart"
      ],
      "mainPracticeIds": [
        "pr-daily-mass"
      ],
      "mainEntityIds": [
        "ent-jesus-christ"
      ],
      "readingTextIds": [],
      "supportingClaimIds": []
    },
    {
      "id": "ev-ordination-example",
      "movementId": "mov-catholic",
      "name": "Ordination of a Priest (example)",
      "description": "A one-time celebration of the sacrament of Holy Orders for a specific candidate.",
      "recurrence": "once",
      "timingRule": "On a particular date chosen by the bishop.",
      "notes": null,
      "tags": [
        "ordination",
        "holy_orders"
      ],
      "mainPracticeIds": [],
      "mainEntityIds": [
        "ent-church-universal"
      ],
      "readingTextIds": [],
      "supportingClaimIds": []
    },
    {
      "id": "ev-lent-season",
      "movementId": "mov-catholic",
      "name": "Season of Lent",
      "description": "The liturgical season of prayer, fasting, and almsgiving leading up to Easter.",
      "recurrence": "other",
      "timingRule": "From Ash Wednesday until the beginning of the Easter Triduum.",
      "notes": null,
      "tags": [
        "lent",
        "season"
      ],
      "mainPracticeIds": [
        "pr-lenten-fasting",
        "pr-charity-service"
      ],
      "mainEntityIds": [
        "ent-lent-season"
      ],
      "readingTextIds": [],
      "supportingClaimIds": [
        "clm-lent-penance"
      ]
    }
  ],
  "rules": [
    {
      "id": "rl-sunday-mass-obligation",
      "movementId": "mov-catholic",
      "shortText": "Catholics must attend Mass on Sundays and holy days of obligation.",
      "kind": "must_do",
      "details": "Missing Mass on these days without a serious reason is considered a grave matter.",
      "appliesTo": [
        "Catholic faithful of required age"
      ],
      "domain": [
        "worship",
        "sacramental_law"
      ],
      "tags": [
        "mass",
        "obligation"
      ],
      "supportingTextIds": [
        "txt-nicene-creed",
        "txt-catechism-root"
      ],
      "supportingClaimIds": [
        "clm-sunday-obligation"
      ],
      "relatedPracticeIds": [
        "pr-sunday-mass"
      ],
      "sourcesOfTruth": [
        "Canon law",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ]
    },
    {
      "id": "rl-no-meat-fridays-lent",
      "movementId": "mov-catholic",
      "shortText": "Abstain from meat on Fridays in Lent.",
      "kind": "must_not_do",
      "details": "On Fridays during Lent, Catholics of appropriate age are asked not to eat meat as a small act of penance.",
      "appliesTo": [
        "Catholic faithful of required age"
      ],
      "domain": [
        "penance",
        "diet"
      ],
      "tags": [
        "lent",
        "fasting",
        "abstinence"
      ],
      "supportingTextIds": [
        "txt-moral-rule-summary"
      ],
      "supportingClaimIds": [
        "clm-lent-penance"
      ],
      "relatedPracticeIds": [
        "pr-lenten-fasting"
      ],
      "sourcesOfTruth": [
        "Canon law",
        "bishops' conference guidelines"
      ],
      "sourceEntityIds": []
    },
    {
      "id": "rl-annual-confession",
      "movementId": "mov-catholic",
      "shortText": "Catholics should confess serious sins at least once a year.",
      "kind": "should_do",
      "details": "The Church encourages regular use of the Sacrament of Reconciliation, especially when conscious of serious sin.",
      "appliesTo": [
        "Catholic faithful"
      ],
      "domain": [
        "penance",
        "sacramental_law"
      ],
      "tags": [
        "confession",
        "penance"
      ],
      "supportingTextIds": [
        "txt-catechism-root"
      ],
      "supportingClaimIds": [
        "clm-grace-participation"
      ],
      "relatedPracticeIds": [
        "pr-reconciliation"
      ],
      "sourcesOfTruth": [
        "Canon law",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ]
    },
    {
      "id": "rl-daily-prayer-ideal",
      "movementId": "mov-catholic",
      "shortText": "Daily personal prayer is an ideal for every Catholic.",
      "kind": "ideal",
      "details": "Catholics are encouraged to set aside time each day for prayer, reading canon, and conversation with God.",
      "appliesTo": [
        "Catholic faithful"
      ],
      "domain": [
        "prayer",
        "spiritual_life"
      ],
      "tags": [
        "prayer",
        "ideal"
      ],
      "supportingTextIds": [
        "txt-our-father"
      ],
      "supportingClaimIds": [
        "clm-grace-participation"
      ],
      "relatedPracticeIds": [
        "pr-daily-rosary",
        "pr-bible-study-group"
      ],
      "sourcesOfTruth": [
        "spiritual tradition"
      ],
      "sourceEntityIds": []
    }
  ],
  "claims": [
    {
      "id": "clm-trinity-central",
      "movementId": "mov-catholic",
      "text": "The mystery of the Most Holy Trinity—one God in three persons—is the central mystery of Catholic faith and life.",
      "category": "theology",
      "tags": [
        "trinity",
        "core_belief"
      ],
      "sourceTextIds": [
        "txt-catechism-trinity",
        "txt-nicene-creed"
      ],
      "aboutEntityIds": [
        "ent-god-trinity",
        "ent-god-father",
        "ent-god-son",
        "ent-holy-spirit"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ],
      "notes": null
    },
    {
      "id": "clm-real-presence-eucharist",
      "movementId": "mov-catholic",
      "text": "In the Eucharist, the consecrated bread and wine truly become the body and blood of Christ, while remaining under the appearances of bread and wine.",
      "category": "sacramental_theology",
      "tags": [
        "eucharist",
        "real_presence"
      ],
      "sourceTextIds": [
        "txt-luke-last-supper",
        "txt-catechism-eucharist"
      ],
      "aboutEntityIds": [
        "ent-eucharist-sacrament",
        "ent-eucharist-host",
        "ent-jesus-christ"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ],
      "notes": null
    },
    {
      "id": "clm-seven-sacraments",
      "movementId": "mov-catholic",
      "text": "The Catholic Church recognizes seven sacraments instituted by Christ as effective signs of grace: Baptism, Confirmation, Eucharist, Penance, Anointing of the Sick, Holy Orders, and Matrimony.",
      "category": "sacramental_theology",
      "tags": [
        "sacraments",
        "seven"
      ],
      "sourceTextIds": [
        "txt-catechism-root"
      ],
      "aboutEntityIds": [
        "ent-eucharist-sacrament"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church",
        "Council of Trent"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ],
      "notes": null
    },
    {
      "id": "clm-mary-mother-of-god",
      "movementId": "mov-catholic",
      "text": "Mary is honored as Mother of God because the one she bore is truly God the Son made man.",
      "category": "mariology",
      "tags": [
        "mary",
        "mother_of_god"
      ],
      "sourceTextIds": [
        "txt-commentary-on-mary"
      ],
      "aboutEntityIds": [
        "ent-virgin-mary",
        "ent-jesus-christ"
      ],
      "sourcesOfTruth": [
        "Ecumenical councils",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ],
      "notes": null
    },
    {
      "id": "clm-grace-participation",
      "movementId": "mov-catholic",
      "text": "Grace is a participation in the life of God, given through Christ by the Holy Spirit.",
      "category": "grace",
      "tags": [
        "grace"
      ],
      "sourceTextIds": [
        "txt-catechism-root"
      ],
      "aboutEntityIds": [
        "ent-god-trinity",
        "ent-church-universal"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ],
      "notes": null
    },
    {
      "id": "clm-sunday-obligation",
      "movementId": "mov-catholic",
      "text": "Sunday, the day of the Lord’s resurrection, is the principal day for the celebration of the Eucharist and a day of obligation for Catholics to participate in Mass.",
      "category": "worship",
      "tags": [
        "sunday",
        "obligation"
      ],
      "sourceTextIds": [
        "txt-catechism-root"
      ],
      "aboutEntityIds": [
        "ent-church-universal"
      ],
      "sourcesOfTruth": [
        "Catechism of the Catholic Church",
        "Canon law"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ],
      "notes": null
    },
    {
      "id": "clm-lent-penance",
      "movementId": "mov-catholic",
      "text": "Lent is a season of special prayer, fasting, and works of charity in preparation for Easter.",
      "category": "penance",
      "tags": [
        "lent",
        "penance"
      ],
      "sourceTextIds": [
        "txt-moral-rule-summary"
      ],
      "aboutEntityIds": [
        "ent-lent-season"
      ],
      "sourcesOfTruth": [
        "liturgical tradition"
      ],
      "sourceEntityIds": [],
      "notes": null
    },
    {
      "id": "clm-communion-of-saints",
      "movementId": "mov-catholic",
      "text": "Catholics believe in the communion of saints, a spiritual solidarity among the faithful on earth, the souls in purification, and the saints in heaven.",
      "category": "ecclesiology",
      "tags": [
        "communion_of_saints"
      ],
      "sourceTextIds": [
        "txt-nicene-creed"
      ],
      "aboutEntityIds": [
        "ent-church-universal"
      ],
      "sourcesOfTruth": [
        "Creeds",
        "Catechism of the Catholic Church"
      ],
      "sourceEntityIds": [
        "ent-catechism"
      ],
      "notes": null
    }
  ],
  "media": [
    {
      "id": "med-crucifix-photo",
      "movementId": "mov-catholic",
      "kind": "image",
      "uri": "https://example.com/images/crucifix.jpg",
      "title": "Crucifix in Parish Church",
      "description": "A crucifix above the altar, symbolizing the sacrifice of Christ remembered in the Mass.",
      "tags": [
        "crucifix",
        "altar",
        "mass"
      ],
      "linkedEntityIds": [
        "ent-crucifix-object",
        "ent-altar"
      ],
      "linkedPracticeIds": [
        "pr-sunday-mass",
        "pr-daily-rosary"
      ],
      "linkedEventIds": [
        "ev-sunday-mass"
      ],
      "linkedTextIds": []
    },
    {
      "id": "med-gregorian-chant",
      "movementId": "mov-catholic",
      "kind": "audio",
      "uri": "https://example.com/audio/gregorian-chant.mp3",
      "title": "Gregorian Chant Kyrie",
      "description": "An example of Gregorian chant used in the liturgy.",
      "tags": [
        "chant",
        "music",
        "liturgy"
      ],
      "linkedEntityIds": [
        "ent-church-universal"
      ],
      "linkedPracticeIds": [
        "pr-sunday-mass"
      ],
      "linkedEventIds": [
        "ev-sunday-mass"
      ],
      "linkedTextIds": []
    },
    {
      "id": "med-mass-video",
      "movementId": "mov-catholic",
      "kind": "video",
      "uri": "https://example.com/video/sunday-mass.mp4",
      "title": "Recorded Sunday Mass",
      "description": "Video of a Sunday Mass including readings, homily, and Eucharistic prayer.",
      "tags": [
        "mass",
        "video"
      ],
      "linkedEntityIds": [
        "ent-parish-local",
        "ent-altar"
      ],
      "linkedPracticeIds": [
        "pr-sunday-mass"
      ],
      "linkedEventIds": [
        "ev-sunday-mass"
      ],
      "linkedTextIds": [
        "txt-catechism-eucharist"
      ]
    },
    {
      "id": "med-hymn-text",
      "movementId": "mov-catholic",
      "kind": "text",
      "uri": "https://example.com/text/hymn.txt",
      "title": "Hymn Text Excerpt",
      "description": "A short hymn text praising the Trinity (example, not an actual hymn).",
      "tags": [
        "hymn",
        "text"
      ],
      "linkedEntityIds": [
        "ent-god-trinity"
      ],
      "linkedPracticeIds": [
        "pr-sunday-mass"
      ],
      "linkedEventIds": [
        "ev-sunday-mass"
      ],
      "linkedTextIds": [
        "txt-catechism-trinity"
      ]
    },
    {
      "id": "med-3d-church-model",
      "movementId": "mov-catholic",
      "kind": "other",
      "uri": "https://example.com/models/church.glb",
      "title": "3D Model of Parish Church",
      "description": "A 3D model asset representing a parish church building.",
      "tags": [
        "3d",
        "church_building"
      ],
      "linkedEntityIds": [
        "ent-parish-local"
      ],
      "linkedPracticeIds": [],
      "linkedEventIds": [
        "ev-sunday-mass"
      ],
      "linkedTextIds": []
    }
  ],
  "notes": [
    {
      "id": "note-mov-catholic-meta",
      "movementId": "mov-catholic",
      "targetType": "Movement",
      "targetId": "mov-catholic",
      "author": "system",
        "body": "This file is an illustrative example of the v3.5 movement data model applied to the Roman Catholic Church. It is not exhaustive or official doctrine, but highlights how texts, entities, practices, events, claims, rules, and media can be structured while connections are derived from their references.",
      "context": "designer",
      "tags": [
        "meta",
        "example"
      ]
    },
    {
      "id": "note-mary-dogmas",
      "movementId": "mov-catholic",
      "targetType": "Entity",
      "targetId": "ent-virgin-mary",
      "author": "system",
      "body": "Catholic teaching includes several dogmas about Mary, such as her title Mother of God, her perpetual virginity, her Immaculate Conception, and her Assumption. Here we only summarize part of that teaching.",
      "context": "theological_note",
      "tags": [
        "mary",
        "dogma",
        "summary"
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
