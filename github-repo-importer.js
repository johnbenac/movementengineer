(function () {
  'use strict';

  const SCHEMA_VERSION = '3.6';
  const MOVEMENT_SCHEMA = 'movement-repo-v1';

  const COLLECTION_NAMES = [
    'movements',
    'textCollections',
    'texts',
    'entities',
    'practices',
    'events',
    'rules',
    'claims',
    'media',
    'notes'
  ];

  const COLLECTION_DIR_CONFIG = {
    entities: { type: 'entity', collection: 'entities' },
    practices: { type: 'practice', collection: 'practices' },
    events: { type: 'event', collection: 'events' },
    rules: { type: 'rule', collection: 'rules' },
    claims: { type: 'claim', collection: 'claims' },
    textCollections: { type: 'textCollection', collection: 'textCollections' },
    texts: { type: 'text', collection: 'texts' },
    media: { type: 'media', collection: 'media' },
    notes: { type: 'note', collection: 'notes' }
  };

  const NOTE_TARGET_COLLECTION = {
    Movement: 'movements',
    TextNode: 'texts',
    Entity: 'entities',
    Practice: 'practices',
    Event: 'events',
    Rule: 'rules',
    Claim: 'claims',
    MediaAsset: 'media'
  };

  function normaliseArray(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(v => v !== undefined && v !== null);
  }

  function ensureSnapshotCollections(snapshot) {
    const ensured = { ...snapshot };
    COLLECTION_NAMES.forEach(name => {
      ensured[name] = Array.isArray(snapshot[name]) ? snapshot[name] : [];
    });
    return ensured;
  }

  function getPathForId(pathIndex, collection, id) {
    if (!pathIndex) return null;
    const coll = pathIndex[collection];
    if (!coll) return null;
    return coll.get(id) || null;
  }

  function createPathIndex() {
    const index = {};
    Object.values(COLLECTION_DIR_CONFIG).forEach(cfg => {
      index[cfg.collection] = new Map();
    });
    index.movements = new Map();
    return index;
  }

  function throwWithPath(message, path) {
    if (path) {
      throw new Error(`${message} (source: ${path})`);
    }
    throw new Error(message);
  }

  function validateIncomingSnapshot(snapshot, options = {}) {
    const { pathIndex } = options;
    const data = ensureSnapshotCollections(snapshot || {});

    const movementIds = new Set();
    data.movements.forEach(movement => {
      if (!movement || typeof movement.id !== 'string' || !movement.id.trim()) {
        throw new Error('Movement is missing a non-empty string id.');
      }
      if (!Array.isArray(movement.tags)) {
        throwWithPath(
          `Movement ${movement.id} must include a tags array (can be empty).`,
          getPathForId(pathIndex, 'movements', movement.id)
        );
      }
      if (movementIds.has(movement.id)) {
        throwWithPath(
          `Duplicate movement id detected: ${movement.id}`,
          getPathForId(pathIndex, 'movements', movement.id)
        );
      }
      movementIds.add(movement.id);
    });

    Object.values(COLLECTION_DIR_CONFIG).forEach(cfg => {
      const seen = new Set();
      data[cfg.collection].forEach(item => {
        if (!item || typeof item.id !== 'string' || !item.id.trim()) {
          throwWithPath(
            `Record in ${cfg.collection} is missing a non-empty id.`,
            getPathForId(pathIndex, cfg.collection, item?.id)
          );
        }
        if (seen.has(item.id)) {
          const p1 = getPathForId(pathIndex, cfg.collection, item.id);
          throwWithPath(`Duplicate id in ${cfg.collection}: ${item.id}`, p1);
        }
        seen.add(item.id);

        if (!movementIds.has(item.movementId)) {
          throwWithPath(
            `Record ${cfg.collection}/${item.id} references unknown movementId ${item.movementId}`,
            getPathForId(pathIndex, cfg.collection, item.id)
          );
        }
      });
    });

    // Cross-reference validation per movement
    const byMovement = {};
    movementIds.forEach(mid => {
      byMovement[mid] = {};
      Object.values(COLLECTION_DIR_CONFIG).forEach(cfg => {
        byMovement[mid][cfg.collection] = data[cfg.collection].filter(
          item => item.movementId === mid
        );
      });
    });

    data.movements.forEach(movement => {
      const mid = movement.id;
      const collections = byMovement[mid];
      if (!collections) return;

      const textIds = new Set(collections.texts.map(t => t.id));
      const entityIds = new Set(collections.entities.map(e => e.id));
      const practiceIds = new Set(collections.practices.map(p => p.id));
      const claimIds = new Set(collections.claims.map(c => c.id));
      const eventIds = new Set(collections.events.map(e => e.id));
      const textCollectionIds = new Set(collections.textCollections.map(tc => tc.id));
      const mediaIds = new Set(collections.media.map(m => m.id));

      collections.texts.forEach(text => {
        if (text.parentId && !textIds.has(text.parentId)) {
          throwWithPath(
            `Missing reference: texts/${text.id} parentId -> ${text.parentId}`,
            getPathForId(pathIndex, 'texts', text.id)
          );
        }
        normaliseArray(text.mentionsEntityIds).forEach(id => {
          if (!entityIds.has(id)) {
            throwWithPath(
              `Missing reference: texts/${text.id} mentionsEntityIds -> ${id}`,
              getPathForId(pathIndex, 'texts', text.id)
            );
          }
        });
      });

      collections.textCollections.forEach(tc => {
        normaliseArray(tc.rootTextIds).forEach(id => {
          if (!textIds.has(id)) {
            throwWithPath(
              `Missing reference: textCollections/${tc.id} rootTextIds -> ${id}`,
              getPathForId(pathIndex, 'textCollections', tc.id)
            );
          }
        });
      });

      collections.practices.forEach(practice => {
        normaliseArray(practice.involvedEntityIds).forEach(id => {
          if (!entityIds.has(id)) {
            throwWithPath(
              `Missing reference: practices/${practice.id} involvedEntityIds -> ${id}`,
              getPathForId(pathIndex, 'practices', practice.id)
            );
          }
        });
        normaliseArray(practice.instructionsTextIds).forEach(id => {
          if (!textIds.has(id)) {
            throwWithPath(
              `Missing reference: practices/${practice.id} instructionsTextIds -> ${id}`,
              getPathForId(pathIndex, 'practices', practice.id)
            );
          }
        });
        normaliseArray(practice.supportingClaimIds).forEach(id => {
          if (!claimIds.has(id)) {
            throwWithPath(
              `Missing reference: practices/${practice.id} supportingClaimIds -> ${id}`,
              getPathForId(pathIndex, 'practices', practice.id)
            );
          }
        });
        normaliseArray(practice.sourceEntityIds).forEach(id => {
          if (!entityIds.has(id)) {
            throwWithPath(
              `Missing reference: practices/${practice.id} sourceEntityIds -> ${id}`,
              getPathForId(pathIndex, 'practices', practice.id)
            );
          }
        });
      });

      collections.events.forEach(event => {
        normaliseArray(event.mainPracticeIds).forEach(id => {
          if (!practiceIds.has(id)) {
            throwWithPath(
              `Missing reference: events/${event.id} mainPracticeIds -> ${id}`,
              getPathForId(pathIndex, 'events', event.id)
            );
          }
        });
        normaliseArray(event.mainEntityIds).forEach(id => {
          if (!entityIds.has(id)) {
            throwWithPath(
              `Missing reference: events/${event.id} mainEntityIds -> ${id}`,
              getPathForId(pathIndex, 'events', event.id)
            );
          }
        });
        normaliseArray(event.readingTextIds).forEach(id => {
          if (!textIds.has(id)) {
            throwWithPath(
              `Missing reference: events/${event.id} readingTextIds -> ${id}`,
              getPathForId(pathIndex, 'events', event.id)
            );
          }
        });
        normaliseArray(event.supportingClaimIds).forEach(id => {
          if (!claimIds.has(id)) {
            throwWithPath(
              `Missing reference: events/${event.id} supportingClaimIds -> ${id}`,
              getPathForId(pathIndex, 'events', event.id)
            );
          }
        });
      });

      collections.rules.forEach(rule => {
        normaliseArray(rule.supportingTextIds).forEach(id => {
          if (!textIds.has(id)) {
            throwWithPath(
              `Missing reference: rules/${rule.id} supportingTextIds -> ${id}`,
              getPathForId(pathIndex, 'rules', rule.id)
            );
          }
        });
        normaliseArray(rule.supportingClaimIds).forEach(id => {
          if (!claimIds.has(id)) {
            throwWithPath(
              `Missing reference: rules/${rule.id} supportingClaimIds -> ${id}`,
              getPathForId(pathIndex, 'rules', rule.id)
            );
          }
        });
        normaliseArray(rule.relatedPracticeIds).forEach(id => {
          if (!practiceIds.has(id)) {
            throwWithPath(
              `Missing reference: rules/${rule.id} relatedPracticeIds -> ${id}`,
              getPathForId(pathIndex, 'rules', rule.id)
            );
          }
        });
        normaliseArray(rule.sourceEntityIds).forEach(id => {
          if (!entityIds.has(id)) {
            throwWithPath(
              `Missing reference: rules/${rule.id} sourceEntityIds -> ${id}`,
              getPathForId(pathIndex, 'rules', rule.id)
            );
          }
        });
      });

      collections.claims.forEach(claim => {
        normaliseArray(claim.sourceTextIds).forEach(id => {
          if (!textIds.has(id)) {
            throwWithPath(
              `Missing reference: claims/${claim.id} sourceTextIds -> ${id}`,
              getPathForId(pathIndex, 'claims', claim.id)
            );
          }
        });
        normaliseArray(claim.aboutEntityIds).forEach(id => {
          if (!entityIds.has(id)) {
            throwWithPath(
              `Missing reference: claims/${claim.id} aboutEntityIds -> ${id}`,
              getPathForId(pathIndex, 'claims', claim.id)
            );
          }
        });
        normaliseArray(claim.sourceEntityIds).forEach(id => {
          if (!entityIds.has(id)) {
            throwWithPath(
              `Missing reference: claims/${claim.id} sourceEntityIds -> ${id}`,
              getPathForId(pathIndex, 'claims', claim.id)
            );
          }
        });
      });

      collections.media.forEach(asset => {
        normaliseArray(asset.linkedEntityIds).forEach(id => {
          if (!entityIds.has(id)) {
            throwWithPath(
              `Missing reference: media/${asset.id} linkedEntityIds -> ${id}`,
              getPathForId(pathIndex, 'media', asset.id)
            );
          }
        });
        normaliseArray(asset.linkedPracticeIds).forEach(id => {
          if (!practiceIds.has(id)) {
            throwWithPath(
              `Missing reference: media/${asset.id} linkedPracticeIds -> ${id}`,
              getPathForId(pathIndex, 'media', asset.id)
            );
          }
        });
        normaliseArray(asset.linkedEventIds).forEach(id => {
          if (!eventIds.has(id)) {
            throwWithPath(
              `Missing reference: media/${asset.id} linkedEventIds -> ${id}`,
              getPathForId(pathIndex, 'media', asset.id)
            );
          }
        });
        normaliseArray(asset.linkedTextIds).forEach(id => {
          if (!textIds.has(id)) {
            throwWithPath(
              `Missing reference: media/${asset.id} linkedTextIds -> ${id}`,
              getPathForId(pathIndex, 'media', asset.id)
            );
          }
        });
      });

      collections.notes.forEach(note => {
        const targetCollection = NOTE_TARGET_COLLECTION[note.targetType];
        if (!targetCollection) {
          throwWithPath(
            `Invalid note targetType for notes/${note.id}: ${note.targetType}`,
            getPathForId(pathIndex, 'notes', note.id)
          );
        }
        const targetItem = (data[targetCollection] || []).find(
          it => it && it.id === note.targetId
        );
        if (!targetItem) {
          throwWithPath(
            `Missing reference: notes/${note.id} targetId -> ${note.targetId} (${note.targetType})`,
            getPathForId(pathIndex, 'notes', note.id)
          );
        }
        if (
          targetItem.movementId &&
          targetItem.movementId !== note.movementId &&
          targetCollection !== 'movements'
        ) {
          throwWithPath(
            `Invalid reference: notes/${note.id} targets ${note.targetType}/${note.targetId} from a different movement`,
            getPathForId(pathIndex, 'notes', note.id)
          );
        }
      });
    });

    return data;
  }

  function verifyCatholicImport(snapshot) {
    const data = validateIncomingSnapshot(snapshot || {});
    if ((data.movements || []).length !== 1) {
      throw new Error(`Expected 1 movement after import, found ${data.movements.length || 0}`);
    }
    const movement = data.movements[0];
    if (movement.id !== 'mov-catholic') {
      throw new Error(`Expected movement id "mov-catholic", found ${movement.id}`);
    }
    if (movement.name !== 'Catholic Church') {
      throw new Error(`Expected movement name "Catholic Church", found ${movement.name}`);
    }

    const expectCount = (collection, expected) => {
      const actual = Array.isArray(data[collection]) ? data[collection].length : 0;
      if (actual !== expected) {
        throw new Error(`Expected ${expected} ${collection}, found ${actual}`);
      }
    };

    expectCount('texts', 13);
    expectCount('textCollections', 2);
    expectCount('entities', 23);
    expectCount('practices', 7);
    expectCount('events', 8);
    expectCount('rules', 4);
    expectCount('claims', 8);
    expectCount('media', 5);
    expectCount('notes', 2);

    const countByFunction = (fnValue, expected) => {
      const actual = data.texts.filter(t => (t.mainFunction || '').toLowerCase() === fnValue)
        .length;
      if (actual !== expected) {
        throw new Error(
          `Expected ${expected} texts with mainFunction "${fnValue}", found ${actual}`
        );
      }
    };

    countByFunction('work', 4);
    countByFunction('section', 1);
    countByFunction('passage', 7);
    countByFunction('line', 1);

    const entity = data.entities.find(e => e.id === 'ent-jesus-christ');
    if (!entity || entity.name !== 'Jesus Christ') {
      throw new Error('Entity ent-jesus-christ with name "Jesus Christ" not found.');
    }

    const practice = data.practices.find(p => p.id === 'pr-sunday-mass');
    if (!practice || practice.name !== 'Sunday Mass') {
      throw new Error('Practice pr-sunday-mass with name "Sunday Mass" not found.');
    }

    const event = data.events.find(ev => ev.id === 'ev-sunday-mass');
    if (!event || event.name !== 'Sunday Mass') {
      throw new Error('Event ev-sunday-mass with name "Sunday Mass" not found.');
    }

    const shelf = data.textCollections.find(tc => tc.id === 'tc-catechism');
    if (!shelf || shelf.name !== 'Catechism of the Catholic Church') {
      throw new Error('Text collection tc-catechism not found or has wrong name.');
    }

    const nicene = data.texts.find(t => t.id === 'txt-nicene-creed');
    if (!nicene || !nicene.content || !nicene.content.includes('I believe in one God')) {
      throw new Error(
        'Text txt-nicene-creed missing or content does not include expected phrase.'
      );
    }

    return true;
  }

  function parseGitHubUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new Error('GitHub repo URL is required.');
    }
    const trimmed = rawUrl.trim();
    let urlStr = trimmed;
    if (!/^https?:\/\//i.test(urlStr)) {
      urlStr = 'https://' + urlStr;
    }
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (e) {
      throw new Error('Invalid URL. Please provide a valid GitHub repository URL.');
    }
    const host = parsed.hostname.toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') {
      throw new Error('Only github.com URLs are supported.');
    }

    const pathParts = parsed.pathname.replace(/\.git$/, '').split('/').filter(Boolean);
    if (pathParts.length < 2) {
      throw new Error('URL must include both owner and repo, e.g. github.com/owner/repo');
    }

    const [owner, repo] = pathParts;
    let ref = null;
    if (pathParts[2] === 'tree') {
      ref = pathParts.slice(3).join('/') || null;
    }

    return { owner, repo, ref, url: trimmed };
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `GitHub API request failed (${res.status} ${res.statusText}): ${body || url}`
      );
    }
    return res.json();
  }

  // Encode ref for /git/ref/heads/<ref-with-slashes>
  function encodeGitRef(ref) {
    return String(ref || '')
      .split('/')
      .filter(Boolean)
      .map(seg => encodeURIComponent(seg))
      .join('/');
  }

  async function fetchRawText(owner, repo, commitSha, path) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${path}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${path} (${res.status} ${res.statusText}).`);
    }
    return res.text();
  }

  async function fetchRawJson(owner, repo, commitSha, path) {
    const text = await fetchRawText(owner, repo, commitSha, path);
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON in ${path}: ${e.message}`);
    }
  }

  async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;

    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await worker(items[i], i);
      }
    });

    await Promise.all(runners);
    return results;
  }

  async function resolveRefToCommitSha(owner, repo, requestedRef) {
    const tryGitRef = async (namespace, refName) => {
      const url = `https://api.github.com/repos/${owner}/${repo}/git/ref/${namespace}/${encodeGitRef(refName)}`;
      try {
        const data = await fetchJson(url);
        return data || null;
      } catch (e) {
        return null;
      }
    };

    const derefTagToCommit = async sha => {
      let currentSha = sha;
      for (let i = 0; i < 4; i += 1) {
        const tag = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/git/tags/${currentSha}`);
        if (!tag || !tag.object || !tag.object.sha) break;
        if (tag.object.type === 'commit') return tag.object.sha;
        if (tag.object.type === 'tag') {
          currentSha = tag.object.sha;
          continue;
        }
        break;
      }
      return sha;
    };

    const buildCandidates = raw => {
      const cleaned = String(raw || '').trim();
      if (!cleaned) return [];
      const parts = cleaned.split('/').filter(Boolean);
      const out = [];
      for (let i = parts.length; i >= 1; i -= 1) {
        out.push(parts.slice(0, i).join('/'));
      }
      return Array.from(new Set(out));
    };

    let refCandidates = buildCandidates(requestedRef);
    if (!refCandidates.length) {
      try {
        const info = await fetchJson(`https://api.github.com/repos/${owner}/${repo}`);
        if (info && info.default_branch) refCandidates.push(info.default_branch);
      } catch (e) {
        // ignore
      }
      if (!refCandidates.includes('main')) refCandidates.push('main');
      if (!refCandidates.includes('master')) refCandidates.push('master');
    }

    for (const candidate of refCandidates) {
      const ref = await tryGitRef('heads', candidate);
      if (ref && ref.object && ref.object.sha) {
        if (ref.object.type === 'commit') return { refName: candidate, commitSha: ref.object.sha };
        if (ref.object.type === 'tag') {
          const commitSha = await derefTagToCommit(ref.object.sha);
          return { refName: candidate, commitSha };
        }
      }
    }

    for (const candidate of refCandidates) {
      const ref = await tryGitRef('tags', candidate);
      if (ref && ref.object && ref.object.sha) {
        if (ref.object.type === 'commit') return { refName: candidate, commitSha: ref.object.sha };
        if (ref.object.type === 'tag') {
          const commitSha = await derefTagToCommit(ref.object.sha);
          return { refName: candidate, commitSha };
        }
      }
    }

    throw new Error(
      `Could not resolve a branch/tag from "${requestedRef || ''}". ` +
        `Try pasting the repo root URL (e.g. https://github.com/${owner}/${repo}).`
    );
  }

  async function listRepoBlobPaths(owner, repo, commitSha) {
    const commit = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`);
    const treeSha = commit && commit.tree && commit.tree.sha;
    if (!treeSha) throw new Error('Could not resolve tree SHA for the selected ref.');

    const tree = await fetchJson(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`
    );

    const entries = Array.isArray(tree && tree.tree) ? tree.tree : [];
    const blobs = entries
      .filter(e => e && e.type === 'blob' && typeof e.path === 'string')
      .map(e => e.path);

    if (tree && tree.truncated) {
      console.warn('GitHub tree listing was truncated; repo may be too large for this importer.');
    }

    return blobs;
  }

  function validateMovementJson(obj, path) {
    if (!obj || typeof obj !== 'object') {
      throwWithPath('movement.json must be a JSON object', path);
    }
    if (obj.schema !== MOVEMENT_SCHEMA) {
      throwWithPath(`movement.json schema must be "${MOVEMENT_SCHEMA}"`, path);
    }
    if (!obj.movement || typeof obj.movement !== 'object') {
      throwWithPath('movement.json is missing "movement" object', path);
    }
    const { id, name, shortName, summary, tags } = obj.movement;
    if (!id || typeof id !== 'string') {
      throwWithPath('movement.id is required and must be a string', path);
    }
    if (!name || typeof name !== 'string') {
      throwWithPath('movement.name is required and must be a string', path);
    }
    if (shortName !== undefined && typeof shortName !== 'string') {
      throwWithPath('movement.shortName must be a string when provided', path);
    }
    if (summary !== undefined && typeof summary !== 'string') {
      throwWithPath('movement.summary must be a string when provided', path);
    }
    if (!Array.isArray(tags)) {
      throwWithPath('movement.tags must be an array (can be empty)', path);
    }
    return {
      id,
      name,
      shortName: shortName || '',
      summary: summary || '',
      tags
    };
  }

  function validateRecordBasics(record, cfg, movementId, path) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throwWithPath(`Records in ${cfg.collection} must be JSON objects`, path);
    }
    if (!record.id || typeof record.id !== 'string') {
      throwWithPath(`Record in ${cfg.collection} missing string id`, path);
    }
    if (!record.movementId || record.movementId !== movementId) {
      throwWithPath(
        `Record ${cfg.collection}/${record.id} movementId must match movement (${movementId})`,
        path
      );
    }
    if (record.type !== cfg.type) {
      throwWithPath(
        `Record ${cfg.collection}/${record.id} type must be "${cfg.type}"`,
        path
      );
    }
  }

  async function parseMovementFromRepo(owner, repo, commitSha, movementJsonPath, blobPaths, pathIndex) {
    const movementFolder = movementJsonPath.replace(/\/movement\.json$/, '');
    const movementObj = await fetchRawJson(owner, repo, commitSha, movementJsonPath);
    const movement = validateMovementJson(movementObj, movementJsonPath);
    pathIndex.movements.set(movement.id, movementJsonPath);

    const movementSnapshot = ensureSnapshotCollections({ version: SCHEMA_VERSION });
    movementSnapshot.movements = [movement];

    const movementPrefix = `${movementFolder}/`;
    const movementFiles = blobPaths
      .filter(p => p.startsWith(movementPrefix))
      .filter(p => p !== movementJsonPath);

    const textMdPaths = new Set();
    const recordJobs = [];

    for (const filePath of movementFiles) {
      const relPath = filePath.slice(movementPrefix.length);
      if (!relPath) continue;

      const [dir, ...restParts] = relPath.split('/');
      if (!dir || restParts.length === 0) continue;

      const fileName = restParts.join('/');

      if (dir === 'texts' && fileName.endsWith('.md')) {
        textMdPaths.add(filePath);
        continue;
      }

      if (!fileName.endsWith('.json')) continue;

      const cfg = COLLECTION_DIR_CONFIG[dir];
      if (!cfg) continue;

      recordJobs.push({ filePath, cfg, fileName });
    }

    const fetched = await mapWithConcurrency(recordJobs, 10, async ({ filePath, cfg, fileName }) => {
      const obj = await fetchRawJson(owner, repo, commitSha, filePath);

      validateRecordBasics(obj, cfg, movement.id, filePath);

      const { type, body, bodyPath, ...rest } = obj;
      const record = { ...rest };

      let textBase = null;
      if (cfg.collection === 'texts') {
        record.content = obj.content ?? obj.body ?? null;
        record.contentPath = obj.contentPath || obj.bodyPath || null;
        textBase = fileName.replace(/\.json$/, '');
      }

      return { record, recordPath: filePath, collection: cfg.collection, textBase };
    });

    const textJsonByBase = new Map();

    for (const item of fetched) {
      const { record, recordPath, collection, textBase } = item;
      const existingPath = pathIndex[collection].get(record.id);
      if (existingPath) {
        throw new Error(
          `Duplicate id ${record.id} found in ${collection}:\n  ${existingPath}\n  ${recordPath}`
        );
      }
      pathIndex[collection].set(record.id, recordPath);
      movementSnapshot[collection].push(record);

      if (collection === 'texts') {
        textJsonByBase.set(textBase, { record, path: recordPath });
      }
    }

    const hydrateJobs = [];
    for (const [baseName, entry] of textJsonByBase.entries()) {
      const mdPath = `${movementFolder}/texts/${baseName}.md`;
      if (!textMdPaths.has(mdPath)) continue;

      if (entry.record.content && String(entry.record.content).trim()) {
        throwWithPath(
          `Ambiguous content for text ${entry.record.id}: both content and markdown file exist.`,
          entry.path
        );
      }

      hydrateJobs.push({ mdPath, entry });
    }

    await mapWithConcurrency(hydrateJobs, 10, async ({ mdPath, entry }) => {
      entry.record.content = await fetchRawText(owner, repo, commitSha, mdPath);
    });

    hydrateJobs.forEach(job => textMdPaths.delete(job.mdPath));

    if (textMdPaths.size > 0) {
      const leftover = Array.from(textMdPaths)[0];
      throwWithPath(
        `Found markdown content file without matching JSON: ${leftover}`,
        leftover
      );
    }

    movementSnapshot.texts.forEach(text => {
      if (text.content === undefined || text.content === null) text.content = '';
      if (typeof text.content !== 'string') {
        throwWithPath(`Text ${text.id} content must be a string`, getPathForId(pathIndex, 'texts', text.id));
      }
    });

    return movementSnapshot;
  }

  async function buildIncomingSnapshotFromRepo(owner, repo, commitSha, movementJsonPaths, blobPaths, pathIndex) {
    const combined = ensureSnapshotCollections({ version: SCHEMA_VERSION });

    for (const movementPath of movementJsonPaths) {
      const movementSnapshot = await parseMovementFromRepo(
        owner,
        repo,
        commitSha,
        movementPath,
        blobPaths,
        pathIndex
      );

      COLLECTION_NAMES.forEach(name => {
        combined[name] = combined[name].concat(movementSnapshot[name] || []);
      });
      if (movementSnapshot.version) combined.version = movementSnapshot.version;
    }

    return combined;
  }

  async function importMovementRepo(url) {
    const repoInfo = parseGitHubUrl(url);

    const { refName, commitSha } = await resolveRefToCommitSha(
      repoInfo.owner,
      repoInfo.repo,
      repoInfo.ref
    );

    const blobPaths = await listRepoBlobPaths(repoInfo.owner, repoInfo.repo, commitSha);

    const movementJsonPaths = blobPaths.filter(path =>
      /^movements\/[^/]+\/movement\.json$/.test(path)
    );

    if (!movementJsonPaths.length) {
      throw new Error('No movements/<name>/movement.json files were found in the repository.');
    }

    const pathIndex = createPathIndex();
    const incomingSnapshot = await buildIncomingSnapshotFromRepo(
      repoInfo.owner,
      repoInfo.repo,
      commitSha,
      movementJsonPaths,
      blobPaths,
      pathIndex
    );

    incomingSnapshot.__repoInfo = { ...repoInfo, ref: refName, commitSha };
    validateIncomingSnapshot(incomingSnapshot, { pathIndex });

    return incomingSnapshot;
  }

  if (typeof window !== 'undefined') {
    window.validateIncomingSnapshot = validateIncomingSnapshot;
    window.verifyCatholicImport = verifyCatholicImport;
    window.GitHubRepoImporter = {
      importMovementRepo
    };
  }

  if (typeof module !== 'undefined') {
    module.exports = {
      validateIncomingSnapshot,
      verifyCatholicImport,
      importMovementRepo
    };
  }
})();
