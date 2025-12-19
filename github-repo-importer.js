(function () {
  'use strict';

  const COLLECTION_DIRS = {
    textCollections: 'textCollections',
    texts: 'texts',
    entities: 'entities',
    practices: 'practices',
    events: 'events',
    rules: 'rules',
    claims: 'claims',
    media: 'media',
    notes: 'notes'
  };

  const TYPE_BY_COLLECTION = {
    textCollections: 'textCollection',
    texts: 'text',
    entities: 'entity',
    practices: 'practice',
    events: 'event',
    rules: 'rule',
    claims: 'claim',
    media: 'media',
    notes: 'note'
  };

  const NOTE_TARGET_TYPES = new Set([
    'Movement',
    'TextNode',
    'Entity',
    'Practice',
    'Event',
    'Rule',
    'Claim',
    'MediaAsset'
  ]);

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function parseGitHubRepoUrl(input) {
    const raw = (input || '').trim();
    if (!raw) throw new Error('GitHub repo URL is required.');

    let url;
    try {
      url = new URL(raw);
    } catch (e) {
      throw new Error(`Invalid URL: ${raw}`);
    }

    if (url.hostname !== 'github.com') {
      throw new Error('Only github.com URLs are supported.');
    }

    const parts = url.pathname.replace(/^\/|\/$/g, '').split('/');
    if (parts.length < 2) throw new Error('URL must include owner and repo.');

    const owner = parts[0];
    let repo = parts[1];
    repo = repo.replace(/\.git$/i, '');

    let ref = null;
    if (parts[2] === 'tree' && parts[3]) {
      ref = parts.slice(3).join('/');
    }

    return { owner, repo, ref, originalUrl: raw };
  }

  async function resolveRef(meta) {
    if (meta.ref) return meta.ref;

    const apiUrl = `https://api.github.com/repos/${meta.owner}/${meta.repo}`;
    try {
      const resp = await fetch(apiUrl);
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.default_branch) return json.default_branch;
      }
    } catch (e) {
      // ignore and try fallbacks
    }

    const fallbacks = ['main', 'master'];
    for (const candidate of fallbacks) {
      try {
        const branchResp = await fetch(
          `https://api.github.com/repos/${meta.owner}/${meta.repo}/branches/${candidate}`
        );
        if (branchResp.ok) return candidate;
      } catch (e) {
        // continue
      }
    }

    throw new Error('Could not determine branch/ref for the repository.');
  }

  function buildStatusError(resp, context) {
    const base = context || 'Request failed';
    const statusText = `${resp.status} ${resp.statusText || ''}`.trim();
    if (resp.status === 403) {
      return `${base}: ${statusText}. You may be rate limited by GitHub.`;
    }
    return `${base}: ${statusText}`;
  }

  async function downloadZipball(meta, ref) {
    const zipUrl = `https://api.github.com/repos/${meta.owner}/${meta.repo}/zipball/${ref}`;
    const resp = await fetch(zipUrl);
    if (!resp.ok) {
      throw new Error(buildStatusError(resp, 'GitHub zip download failed'));
    }
    return resp.arrayBuffer();
  }

  function detectRootPrefix(zip) {
    const names = Object.keys(zip.files || {});
    const first = names.find(n => n.includes('/'));
    if (!first) return '';
    const root = first.split('/')[0];
    return root ? `${root}/` : '';
  }

  function stripRoot(path, rootPrefix) {
    return rootPrefix && path.startsWith(rootPrefix)
      ? path.slice(rootPrefix.length)
      : path;
  }

  async function readJsonFromZip(zip, path) {
    const file = zip.file(path);
    if (!file) throw new Error(`Missing file in archive: ${path}`);
    try {
      const text = await file.async('string');
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse JSON (${path}): ${e.message}`);
    }
  }

  function validateMovementManifest(manifest, path) {
    assert(manifest && typeof manifest === 'object', `movement.json at ${path} is not an object.`);
    assert(
      manifest.schema === 'movement-repo-v1',
      `movement.json at ${path} has invalid schema (${manifest.schema}).`
    );
    const movement = manifest.movement;
    assert(movement && typeof movement === 'object', `movement.json at ${path} is missing "movement".`);
    assert(
      typeof movement.id === 'string' && movement.id.trim(),
      `movement.id missing/empty in ${path}.`
    );
    assert(
      typeof movement.name === 'string' && movement.name.trim(),
      `movement.name missing/empty in ${path}.`
    );
    assert(
      typeof movement.shortName === 'string' && movement.shortName.trim(),
      `movement.shortName missing/empty in ${path}.`
    );
    assert(
      typeof movement.summary === 'string',
      `movement.summary must be a string in ${path}.`
    );
    assert(Array.isArray(movement.tags), `movement.tags must be an array in ${path}.`);
    return movement;
  }

  function validateRecordObject(obj, movementId, collectionName, path) {
    if (Array.isArray(obj)) {
      throw new Error(`Expected an object in ${path}, but found an array.`);
    }
    assert(obj && typeof obj === 'object', `Record in ${path} is not an object.`);
    assert(typeof obj.id === 'string' && obj.id.trim(), `${collectionName} record missing id (${path}).`);
    assert(
      typeof obj.movementId === 'string' &&
        obj.movementId.trim() &&
        obj.movementId === movementId,
      `${collectionName} ${obj.id} has invalid movementId (expected ${movementId}) in ${path}.`
    );

    const expectedType = TYPE_BY_COLLECTION[collectionName];
    if (expectedType) {
      assert(
        typeof obj.type === 'string' && obj.type.trim(),
        `${collectionName} ${obj.id} missing required type in ${path}.`
      );
      if (obj.type !== expectedType) {
        throw new Error(
          `${collectionName} ${obj.id} type mismatch in ${path}: expected ${expectedType}, got ${obj.type}`
        );
      }
    }

    const { type, ...rest } = obj;
    return rest;
  }

  function assertUniqueId(map, id, path, collectionName) {
    if (map.has(id)) {
      const firstPath = map.get(id);
      throw new Error(
        `Duplicate id ${id} found in ${collectionName}:\n- ${firstPath}\n- ${path}`
      );
    }
    map.set(id, path);
  }

  function getPathFor(pathMap, collection, id) {
    return pathMap[collection] ? pathMap[collection].get(id) : null;
  }

  function expectArrayField(obj, field, path, collectionName) {
    if (!Array.isArray(obj[field])) {
      throw new Error(
        `${collectionName} ${obj.id} expected ${field} to be an array (${path}).`
      );
    }
  }

  function enforceArrayShape(collectionName, record, path) {
    switch (collectionName) {
      case 'texts':
        expectArrayField(record, 'mentionsEntityIds', path, collectionName);
        break;
      case 'textCollections':
        expectArrayField(record, 'rootTextIds', path, collectionName);
        break;
      case 'practices':
        expectArrayField(record, 'involvedEntityIds', path, collectionName);
        expectArrayField(record, 'instructionsTextIds', path, collectionName);
        expectArrayField(record, 'supportingClaimIds', path, collectionName);
        expectArrayField(record, 'sourceEntityIds', path, collectionName);
        break;
      case 'events':
        expectArrayField(record, 'mainPracticeIds', path, collectionName);
        expectArrayField(record, 'mainEntityIds', path, collectionName);
        expectArrayField(record, 'readingTextIds', path, collectionName);
        expectArrayField(record, 'supportingClaimIds', path, collectionName);
        break;
      case 'rules':
        expectArrayField(record, 'supportingTextIds', path, collectionName);
        expectArrayField(record, 'supportingClaimIds', path, collectionName);
        expectArrayField(record, 'relatedPracticeIds', path, collectionName);
        expectArrayField(record, 'sourceEntityIds', path, collectionName);
        break;
      case 'claims':
        expectArrayField(record, 'sourceTextIds', path, collectionName);
        expectArrayField(record, 'aboutEntityIds', path, collectionName);
        expectArrayField(record, 'sourceEntityIds', path, collectionName);
        break;
      case 'media':
        expectArrayField(record, 'linkedEntityIds', path, collectionName);
        expectArrayField(record, 'linkedPracticeIds', path, collectionName);
        expectArrayField(record, 'linkedEventIds', path, collectionName);
        expectArrayField(record, 'linkedTextIds', path, collectionName);
        break;
      case 'notes':
        expectArrayField(record, 'tags', path, collectionName);
        break;
      default:
        break;
    }
  }

  function validateMovementReferences(movementData, pathMap) {
    const lookups = {};
    StorageService.COLLECTION_NAMES.forEach(coll => {
      lookups[coll] = new Map(
        (movementData[coll] || []).map(item => [item.id, item])
      );
    });

    const movementId = movementData.movements[0]?.id;

    const failRef = (collection, item, field, missingId, targetCollection) => {
      const src = getPathFor(pathMap, collection, item.id);
      const target = getPathFor(pathMap, targetCollection, missingId);
      const details = [src ? `source: ${src}` : null, target ? `target: ${target}` : null]
        .filter(Boolean)
        .join(' | ');
      throw new Error(
        `${collection} ${item.id} is missing reference ${field}: ${missingId}${
          details ? ` (${details})` : ''
        }`
      );
    };

    const ensureRef = (collection, item, field, targetCollection, id) => {
      if (!id) return;
      const target = lookups[targetCollection].get(id);
      if (!target) {
        failRef(collection, item, field, id, targetCollection);
      } else if (target.movementId && target.movementId !== movementId) {
        throw new Error(
          `${collection} ${item.id} references ${id} across movements in ${field} (source: ${movementId}, target: ${target.movementId}).`
        );
      }
    };

    const ensureArrayRefs = (collection, item, field, targetCollection, arr) => {
      (Array.isArray(arr) ? arr : []).forEach(id =>
        ensureRef(collection, item, field, targetCollection, id)
      );
    };

    movementData.texts.forEach(text => {
      if (text.parentId) ensureRef('texts', text, 'parentId', 'texts', text.parentId);
      ensureArrayRefs('texts', text, 'mentionsEntityIds', 'entities', text.mentionsEntityIds);
    });

    movementData.textCollections.forEach(tc => {
      ensureArrayRefs('textCollections', tc, 'rootTextIds', 'texts', tc.rootTextIds);
    });

    movementData.practices.forEach(practice => {
      ensureArrayRefs('practices', practice, 'involvedEntityIds', 'entities', practice.involvedEntityIds);
      ensureArrayRefs('practices', practice, 'instructionsTextIds', 'texts', practice.instructionsTextIds);
      ensureArrayRefs('practices', practice, 'supportingClaimIds', 'claims', practice.supportingClaimIds);
      ensureArrayRefs('practices', practice, 'sourceEntityIds', 'entities', practice.sourceEntityIds);
    });

    movementData.events.forEach(event => {
      ensureArrayRefs('events', event, 'mainPracticeIds', 'practices', event.mainPracticeIds);
      ensureArrayRefs('events', event, 'mainEntityIds', 'entities', event.mainEntityIds);
      ensureArrayRefs('events', event, 'readingTextIds', 'texts', event.readingTextIds);
      ensureArrayRefs('events', event, 'supportingClaimIds', 'claims', event.supportingClaimIds);
    });

    movementData.rules.forEach(rule => {
      ensureArrayRefs('rules', rule, 'supportingTextIds', 'texts', rule.supportingTextIds);
      ensureArrayRefs('rules', rule, 'supportingClaimIds', 'claims', rule.supportingClaimIds);
      ensureArrayRefs('rules', rule, 'relatedPracticeIds', 'practices', rule.relatedPracticeIds);
      ensureArrayRefs('rules', rule, 'sourceEntityIds', 'entities', rule.sourceEntityIds);
    });

    movementData.claims.forEach(claim => {
      ensureArrayRefs('claims', claim, 'sourceTextIds', 'texts', claim.sourceTextIds);
      ensureArrayRefs('claims', claim, 'aboutEntityIds', 'entities', claim.aboutEntityIds);
      ensureArrayRefs('claims', claim, 'sourceEntityIds', 'entities', claim.sourceEntityIds);
    });

    movementData.media.forEach(media => {
      ensureArrayRefs('media', media, 'linkedEntityIds', 'entities', media.linkedEntityIds);
      ensureArrayRefs('media', media, 'linkedPracticeIds', 'practices', media.linkedPracticeIds);
      ensureArrayRefs('media', media, 'linkedEventIds', 'events', media.linkedEventIds);
      ensureArrayRefs('media', media, 'linkedTextIds', 'texts', media.linkedTextIds);
    });

    movementData.notes.forEach(note => {
      if (!NOTE_TARGET_TYPES.has(note.targetType)) {
        throw new Error(
          `Note ${note.id} has invalid targetType ${note.targetType} (source: ${getPathFor(
            pathMap,
            'notes',
            note.id
          ) || 'unknown'})`
        );
      }
      const map = {
        Movement: 'movements',
        TextNode: 'texts',
        Entity: 'entities',
        Practice: 'practices',
        Event: 'events',
        Rule: 'rules',
        Claim: 'claims',
        MediaAsset: 'media'
      };
      ensureRef('notes', note, 'targetId', map[note.targetType], note.targetId);
    });
  }

  async function hydrateTextContent(zip, textRecords, baseDir, rootPrefix) {
    const mdFiles = Object.keys(zip.files)
      .filter(name => !zip.files[name].dir)
      .map(name => stripRoot(name, rootPrefix))
      .filter(path => path.startsWith(`${baseDir}texts/`) && path.endsWith('.md'));

    const mdByStem = new Map();
    mdFiles.forEach(path => {
      const stem = path.replace(`${baseDir}texts/`, '').replace(/\.md$/, '');
      mdByStem.set(stem, path);
    });

    // Detect dangling markdown files
    textRecords.forEach(record => {
      const stem = record.id;
      if (!mdByStem.has(stem)) return;
      const mdPath = mdByStem.get(stem);
      const hasInlineContent = Boolean((record.content || '').trim());
      if (hasInlineContent) {
        throw new Error(
          `Text ${record.id} has both inline content and markdown file (${mdPath}).`
        );
      }
    });

    // Missing JSON for markdown
    mdByStem.forEach((mdPath, stem) => {
      const hasJson = textRecords.some(t => t.id === stem);
      if (!hasJson) {
        throw new Error(
          `Markdown file ${mdPath} has no matching JSON record in texts/.`
        );
      }
    });

    // Hydrate
    for (const text of textRecords) {
      const mdPath = mdByStem.get(text.id);
      if (!mdPath) continue;
      const file = zip.file(`${rootPrefix}${mdPath}`);
      if (!file) continue;
      text.content = await file.async('string');
    }
  }

  async function buildMovementDataFromFolder(zip, movementJsonPath, rootPrefix) {
    const relativeMovementPath = stripRoot(movementJsonPath, rootPrefix);
    const baseDir = relativeMovementPath.replace(/movement\.json$/, '');
    const manifest = await readJsonFromZip(zip, movementJsonPath);
    const movement = validateMovementManifest(manifest, relativeMovementPath);
    const movementId = movement.id;

    const movementData = StorageService.createEmptySnapshot();
    movementData.movements = [movement];

    const pathMap = {};
    StorageService.COLLECTION_NAMES.forEach(coll => {
      pathMap[coll] = new Map();
    });
    pathMap.movements.set(movementId, relativeMovementPath);

    for (const [collectionName, dir] of Object.entries(COLLECTION_DIRS)) {
      const expectedType = TYPE_BY_COLLECTION[collectionName];
      const files = Object.keys(zip.files)
        .filter(name => !zip.files[name].dir)
        .map(name => stripRoot(name, rootPrefix))
        .filter(path => path.startsWith(`${baseDir}${dir}/`) && path.endsWith('.json'));

      const records = [];
      const seenIds = new Map();

      for (const relPath of files) {
        const absPath = `${rootPrefix}${relPath}`;
        const parsed = await readJsonFromZip(zip, absPath);
        const validated = validateRecordObject(parsed, movementId, collectionName, relPath);
        enforceArrayShape(collectionName, validated, relPath);
        assertUniqueId(seenIds, validated.id, relPath, collectionName);
        pathMap[collectionName].set(validated.id, relPath);
        records.push(validated);
      }

      movementData[collectionName] = records;

      if (collectionName === 'texts') {
        await hydrateTextContent(zip, records, baseDir, rootPrefix);
      }
    }

    validateMovementReferences(movementData, pathMap);
    return movementData;
  }

  async function buildSnapshotFromZip(zip) {
    const rootPrefix = detectRootPrefix(zip);
    const fileNames = Object.keys(zip.files || {});
    const movementFiles = fileNames
      .filter(name => !zip.files[name].dir)
      .filter(name => name.endsWith('movement.json'))
      .filter(name =>
        stripRoot(name, rootPrefix).match(/^movements\/[^/]+\/movement\.json$/)
      );

    if (!movementFiles.length) {
      throw new Error('No movement.json files found under movements/.');
    }

    const incomingSnapshot = StorageService.createEmptySnapshot();
    const seenIds = new Set();

    for (const movementPath of movementFiles) {
      const movementData = await buildMovementDataFromFolder(zip, movementPath, rootPrefix);
      const movementId = movementData.movements[0].id;

      // overwrite movement data for duplicate ids within incoming snapshot
      if (seenIds.has(movementId)) {
        // remove previous records for this movementId
        StorageService.COLLECTION_NAMES.forEach(coll => {
          incomingSnapshot[coll] = incomingSnapshot[coll].filter(
            item => item.movementId !== movementId && item.id !== movementId
          );
        });
      }

      StorageService.COLLECTION_NAMES.forEach(coll => {
        if (Array.isArray(movementData[coll])) {
          incomingSnapshot[coll] = incomingSnapshot[coll].concat(movementData[coll]);
        }
      });
      seenIds.add(movementId);
    }

    return incomingSnapshot;
  }

  async function importMovementRepo(url) {
    const meta = parseGitHubRepoUrl(url);
    const ref = await resolveRef(meta);
    const buffer = await downloadZipball(meta, ref);
    const zip = await JSZip.loadAsync(buffer);
    const incomingSnapshot = await buildSnapshotFromZip(zip);
    const validated = window.validateIncomingSnapshot(incomingSnapshot);
    return { snapshot: validated, meta: { ...meta, ref } };
  }

  window.GitHubRepoImporter = {
    importMovementRepo
  };
})();
