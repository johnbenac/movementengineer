(function () {
  'use strict';

  const SNAPSHOT_VERSION =
    (typeof StorageService !== 'undefined' &&
      StorageService.createEmptySnapshot().version) ||
    '3.6';
  const MOVEMENT_SCHEMA = 'movement-repo-v1';

  const COLLECTION_CONFIG = {
    entities: { dir: 'entities', type: 'entity' },
    practices: { dir: 'practices', type: 'practice' },
    events: { dir: 'events', type: 'event' },
    rules: { dir: 'rules', type: 'rule' },
    claims: { dir: 'claims', type: 'claim' },
    textCollections: { dir: 'textCollections', type: 'textCollection' },
    texts: { dir: 'texts', type: 'text' },
    media: { dir: 'media', type: 'media' },
    notes: { dir: 'notes', type: 'note' }
  };

  const NOTE_TARGET_COLLECTION_MAP = {
    movement: 'movements',
    Movement: 'movements',
    Entity: 'entities',
    entity: 'entities',
    Practice: 'practices',
    practice: 'practices',
    Event: 'events',
    event: 'events',
    Rule: 'rules',
    rule: 'rules',
    Claim: 'claims',
    claim: 'claims',
    Media: 'media',
    media: 'media',
    Text: 'texts',
    text: 'texts',
    TextNode: 'texts',
    Texts: 'texts',
    TextCollection: 'textCollections'
  };

  function normaliseGithubRepoUrl(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('GitHub repo URL is required.');
    }
    let urlObj;
    const trimmed = input.trim();
    try {
      urlObj = new URL(trimmed);
    } catch (e) {
      throw new Error('Invalid GitHub URL. Expected https://github.com/<owner>/<repo>');
    }
    if (urlObj.hostname !== 'github.com') {
      throw new Error('URL must be on github.com');
    }
    const parts = urlObj.pathname.replace(/\.git$/, '').split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error('GitHub URL must include both owner and repo');
    }
    const [owner, repo, maybeTree, ...rest] = parts;
    let ref = null;
    if (maybeTree === 'tree' && rest.length) {
      ref = rest[0];
    }

    const normalizedUrl = `https://github.com/${owner}/${repo}`;
    return { owner, repo, ref, normalizedUrl };
  }

  async function resolveRef({ owner, repo, ref }) {
    if (ref) return ref;

    try {
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.default_branch) return data.default_branch;
      }
    } catch (e) {
      console.warn('Failed to fetch default branch:', e);
    }

    const fallbacks = ['main', 'master'];
    for (const candidate of fallbacks) {
      try {
        const branchResp = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/branches/${candidate}`
        );
        if (branchResp && branchResp.ok) return candidate;
      } catch (e) {
        // ignore and try next
      }
    }

    throw new Error('Could not determine branch/ref for repository.');
  }

  async function downloadRepoZip(owner, repo, ref) {
    const url = `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const statusLine = `${resp.status} ${resp.statusText}`;
      const rateLimit = resp.status === 403 ? ' (possible rate limit)' : '';
      let body = '';
      try {
        body = await resp.text();
      } catch (e) {
        // ignore
      }
      throw new Error(
        `Failed to download repository ZIP: ${statusLine}${rateLimit}${
          body ? `\n${body}` : ''
        }`
      );
    }
    return resp.arrayBuffer();
  }

  function detectZipRootPrefix(zip) {
    const allPaths = Object.keys(zip.files || {});
    if (!allPaths.length) return '';
    const firstPath = allPaths[0];
    if (!firstPath.includes('/')) return '';
    return firstPath.split('/')[0];
  }

  function buildFileIndex(zip, rootPrefix) {
    const files = {};
    Object.entries(zip.files || {}).forEach(([path, file]) => {
      if (file.dir) return;
      const trimmed = rootPrefix && path.startsWith(rootPrefix + '/')
        ? path.slice(rootPrefix.length + 1)
        : path;
      files[trimmed] = file;
    });
    return files;
  }

  async function parseJsonFile(zipFile, path) {
    try {
      const text = await zipFile.async('string');
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse JSON at ${path}: ${e.message || e}`);
    }
  }

  function requireObject(obj, path) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error(`Expected an object in ${path}`);
    }
  }

  function validateMovementHeader(data, path) {
    requireObject(data, path);
    if (data.schema !== MOVEMENT_SCHEMA) {
      throw new Error(
        `Invalid schema in ${path}. Expected "${MOVEMENT_SCHEMA}", got "${data.schema}"`
      );
    }
    const movement = data.movement;
    requireObject(movement, path);
    if (!movement.id || typeof movement.id !== 'string') {
      throw new Error(`movement.id is required and must be a string in ${path}`);
    }
    if (!Array.isArray(movement.tags)) {
      throw new Error(`movement.tags must be an array in ${path}`);
    }
    return movement;
  }

  function validateRecordBasics(record, expectedType, movementId, path) {
    requireObject(record, path);
    if (!record.id || typeof record.id !== 'string') {
      throw new Error(`Record at ${path} is missing a non-empty string id`);
    }
    if (!record.movementId || record.movementId !== movementId) {
      throw new Error(
        `Record ${record.id} at ${path} has movementId "${record.movementId}" but expected "${movementId}"`
      );
    }
    if (record.type !== expectedType) {
      throw new Error(
        `Record ${record.id} at ${path} has type "${record.type}", expected "${expectedType}"`
      );
    }
    const cleaned = { ...record };
    delete cleaned.type;
    delete cleaned.body;
    delete cleaned.bodyPath;
    return cleaned;
  }

  function pathForTextMarkdown(baseDir, filePath) {
    const base = filePath.replace(/\.json$/i, '');
    return `${base}.md`.replace(`${baseDir}//`, `${baseDir}/`);
  }

  async function hydrateTextContent(record, mdFile, jsonPath, mdPath) {
    const inlineContent = record.content;
    const hasInline = typeof inlineContent === 'string' && inlineContent.trim().length > 0;
    if (mdFile) {
      if (hasInline) {
        throw new Error(
          `Text ${record.id} has both inline content and markdown file (${mdPath})`
        );
      }
      record.content = await mdFile.async('string');
    } else if (!hasInline && inlineContent === '') {
      record.content = '';
    }
    if (inlineContent == null && !mdFile) {
      record.content = record.content ?? null;
    }
    record.contentPath = mdFile ? mdPath : record.contentPath;
    return record;
  }

  function ensureUniqueId(collectionName, id, pathMap, currentPath) {
    if (pathMap.has(id)) {
      const firstPath = pathMap.get(id);
      throw new Error(
        `Duplicate id "${id}" in ${collectionName} between ${firstPath} and ${currentPath}`
      );
    }
    pathMap.set(id, currentPath);
  }

  function extractMovementSlug(movementJsonPath) {
    const match = movementJsonPath.match(/^movements\/([^/]+)\/movement\.json$/);
    return match ? match[1] : null;
  }

  async function buildIncomingSnapshotFromZip(fileIndex, repoInfo, resolvedRef) {
    const incoming = StorageService.createEmptySnapshot();
    incoming.version = incoming.version || SNAPSHOT_VERSION;
    const sourceMeta = {
      repo: { ...repoInfo, ref: resolvedRef },
      movements: {},
      collectionPaths: {}
    };
    Object.keys(COLLECTION_CONFIG).forEach(coll => {
      sourceMeta.collectionPaths[coll] = {};
    });

    const movementHeaders = Object.keys(fileIndex).filter(path =>
      /^movements\/[^/]+\/movement\.json$/.test(path)
    );
    if (!movementHeaders.length) {
      throw new Error('No movements found in repository (missing movement.json files).');
    }

    const duplicateTrackers = {
      movements: new Map()
    };
    Object.keys(COLLECTION_CONFIG).forEach(coll => {
      duplicateTrackers[coll] = new Map();
    });

    for (const movementPath of movementHeaders) {
      const movementSlug = extractMovementSlug(movementPath);
      const movementJson = await parseJsonFile(fileIndex[movementPath], movementPath);
      const movement = validateMovementHeader(movementJson, movementPath);
      ensureUniqueId('movements', movement.id, duplicateTrackers.movements, movementPath);
      incoming.movements.push(movement);
      sourceMeta.movements[movement.id] = movementPath;

      for (const [collectionName, config] of Object.entries(COLLECTION_CONFIG)) {
        const dir = `movements/${movementSlug}/${config.dir}/`;
        const jsonFiles = Object.keys(fileIndex).filter(
          path => path.startsWith(dir) && path.endsWith('.json')
        );
        const mdFiles =
          collectionName === 'texts'
            ? Object.keys(fileIndex).filter(
                path => path.startsWith(dir) && path.endsWith('.md')
              )
            : [];

        const textBaseNames = new Set();
        for (const jsonPath of jsonFiles) {
          const rawRecord = await parseJsonFile(fileIndex[jsonPath], jsonPath);
          const record = validateRecordBasics(
            rawRecord,
            config.type,
            movement.id,
            jsonPath
          );
          if (collectionName === 'texts') {
            const mdPath = pathForTextMarkdown(dir, jsonPath);
            const mdFile = fileIndex[mdPath];
            await hydrateTextContent(record, mdFile, jsonPath, mdPath);
            textBaseNames.add(jsonPath.replace(/^.*\//, '').replace(/\.json$/, ''));
          }

          ensureUniqueId(
            collectionName,
            record.id,
            duplicateTrackers[collectionName],
            jsonPath
          );
          incoming[collectionName].push(record);
          sourceMeta.collectionPaths[collectionName][record.id] = jsonPath;
        }

        if (collectionName === 'texts') {
          mdFiles.forEach(mdPath => {
            const base = mdPath.replace(/^.*\//, '').replace(/\.md$/, '');
            if (!textBaseNames.has(base)) {
              throw new Error(`Dangling markdown without JSON: ${mdPath}`);
            }
          });
        }
      }
    }

    return { incoming, sourceMeta };
  }

  function getSourcePath(collectionName, id, sourceMeta) {
    if (!sourceMeta) return null;
    if (collectionName === 'movements') {
      return sourceMeta.movements?.[id] || null;
    }
    return sourceMeta.collectionPaths?.[collectionName]?.[id] || null;
  }

  function formatRefMessage(collectionName, id, sourceMeta) {
    const src = getSourcePath(collectionName, id, sourceMeta);
    return src ? `${collectionName}/${id} (${src})` : `${collectionName}/${id}`;
  }

  function ensureArray(value, pathLabel) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      throw new Error(`${pathLabel} must be an array`);
    }
    return value;
  }

  function validateIncomingSnapshot(rawSnapshot, sourceMeta = null) {
    const normalized = StorageService.ensureAllCollections(
      JSON.parse(JSON.stringify(rawSnapshot || {}))
    );
    if (!normalized.version) normalized.version = SNAPSHOT_VERSION;
    Object.keys(COLLECTION_CONFIG).forEach(name => {
      normalized[name] = (normalized[name] || []).map(item => {
        if (!item || typeof item !== 'object') return item;
        const cleaned = { ...item };
        if (cleaned.type) delete cleaned.type;
        if (cleaned.body && cleaned.content == null) cleaned.content = cleaned.body;
        if (!cleaned.contentPath && cleaned.bodyPath) cleaned.contentPath = cleaned.bodyPath;
        delete cleaned.body;
        delete cleaned.bodyPath;
        return cleaned;
      });
    });
    if (!normalized.movements.length) {
      throw new Error('No movements found in snapshot.');
    }

    const movementById = new Map();
    normalized.movements.forEach(movement => {
      if (!movement || typeof movement !== 'object') {
        throw new Error('Movement entries must be objects.');
      }
      if (!movement.id || typeof movement.id !== 'string') {
        throw new Error('Each movement must have a non-empty string id.');
      }
      if (movementById.has(movement.id)) {
        const prev = formatRefMessage('movements', movement.id, sourceMeta);
        throw new Error(
          `Duplicate movement id "${movement.id}" found. First seen at ${prev}.`
        );
      }
      if (!Array.isArray(movement.tags)) {
        throw new Error(
          `movement.tags must be an array for ${formatRefMessage(
            'movements',
            movement.id,
            sourceMeta
          )}`
        );
      }
      movementById.set(movement.id, movement);
    });

    const collectionNames = Object.keys(COLLECTION_CONFIG);
    const collectionIndexes = {};
    collectionNames.forEach(name => {
      collectionIndexes[name] = new Map();
      normalized[name].forEach(item => {
        if (!item || typeof item !== 'object') {
          throw new Error(`Items in ${name} must be objects.`);
        }
        if (!item.id || typeof item.id !== 'string') {
          throw new Error(
            `Item in ${name} is missing a string id (${formatRefMessage(
              name,
              item.id || 'unknown',
              sourceMeta
            )})`
          );
        }
        const movementId = item.movementId;
        if (!movementById.has(movementId)) {
          throw new Error(
            `Unknown movementId "${movementId}" on ${formatRefMessage(
              name,
              item.id,
              sourceMeta
            )}`
          );
        }
        if (collectionIndexes[name].has(item.id)) {
          const prev = formatRefMessage(name, item.id, sourceMeta);
          throw new Error(
            `Duplicate id "${item.id}" in collection ${name} (${prev} and ${formatRefMessage(
              name,
              item.id,
              sourceMeta
            )})`
          );
        }
        collectionIndexes[name].set(item.id, item);
      });
    });

    function assertIdsExist(
      records,
      field,
      targetCollection,
      movementId,
      recordCollection
    ) {
      const lookup = collectionIndexes[targetCollection];
      records.forEach(record => {
        const ids = ensureArray(
          record[field],
          `${formatRefMessage(recordCollection, record.id, sourceMeta)}.${field}`
        );
        ids.forEach(refId => {
          const target = lookup.get(refId);
          if (!target || target.movementId !== movementId) {
            throw new Error(
              `Missing reference: ${formatRefMessage(
                targetCollection === 'texts' && field === 'parentId'
                  ? 'texts'
                  : recordCollection || targetCollection,
                record.id,
                sourceMeta
              )} field "${field}" points to ${targetCollection} "${refId}" which was not found.`
            );
          }
        });
      });
    }

    normalized.movements.forEach(movement => {
      const mId = movement.id;
      const texts = normalized.texts.filter(t => t.movementId === mId);
      const textCollections = normalized.textCollections.filter(tc => tc.movementId === mId);
      const entities = normalized.entities.filter(e => e.movementId === mId);
      const practices = normalized.practices.filter(p => p.movementId === mId);
      const events = normalized.events.filter(e => e.movementId === mId);
      const rules = normalized.rules.filter(r => r.movementId === mId);
      const claims = normalized.claims.filter(c => c.movementId === mId);
      const media = normalized.media.filter(m => m.movementId === mId);
      const notes = normalized.notes.filter(n => n.movementId === mId);

      texts.forEach(text => {
        if (text.parentId) {
          const parent = collectionIndexes.texts.get(text.parentId);
          if (!parent || parent.movementId !== mId) {
            throw new Error(
              `Missing reference: ${formatRefMessage(
                'texts',
                text.id,
                sourceMeta
              )} field "parentId" points to missing text "${text.parentId}".`
            );
          }
        }
      });
      assertIdsExist(texts, 'mentionsEntityIds', 'entities', mId, 'texts');
      assertIdsExist(textCollections, 'rootTextIds', 'texts', mId, 'textCollections');
      assertIdsExist(practices, 'involvedEntityIds', 'entities', mId, 'practices');
      assertIdsExist(practices, 'instructionsTextIds', 'texts', mId, 'practices');
      assertIdsExist(practices, 'supportingClaimIds', 'claims', mId, 'practices');
      assertIdsExist(practices, 'sourceEntityIds', 'entities', mId, 'practices');
      assertIdsExist(events, 'mainPracticeIds', 'practices', mId, 'events');
      assertIdsExist(events, 'mainEntityIds', 'entities', mId, 'events');
      assertIdsExist(events, 'readingTextIds', 'texts', mId, 'events');
      assertIdsExist(events, 'supportingClaimIds', 'claims', mId, 'events');
      assertIdsExist(rules, 'supportingTextIds', 'texts', mId, 'rules');
      assertIdsExist(rules, 'supportingClaimIds', 'claims', mId, 'rules');
      assertIdsExist(rules, 'relatedPracticeIds', 'practices', mId, 'rules');
      assertIdsExist(rules, 'sourceEntityIds', 'entities', mId, 'rules');
      assertIdsExist(claims, 'sourceTextIds', 'texts', mId, 'claims');
      assertIdsExist(claims, 'aboutEntityIds', 'entities', mId, 'claims');
      assertIdsExist(claims, 'sourceEntityIds', 'entities', mId, 'claims');
      assertIdsExist(media, 'linkedEntityIds', 'entities', mId, 'media');
      assertIdsExist(media, 'linkedPracticeIds', 'practices', mId, 'media');
      assertIdsExist(media, 'linkedEventIds', 'events', mId, 'media');
      assertIdsExist(media, 'linkedTextIds', 'texts', mId, 'media');

      notes.forEach(note => {
        const targetType = note.targetType;
        const targetId = note.targetId;
        const mappedCollection = NOTE_TARGET_COLLECTION_MAP[targetType];
        if (!mappedCollection) {
          throw new Error(
            `Invalid note targetType "${targetType}" on ${formatRefMessage(
              'notes',
              note.id,
              sourceMeta
            )}`
          );
        }
        if (mappedCollection === 'movements') {
          if (!movementById.has(targetId)) {
            throw new Error(
              `Note ${formatRefMessage(
                'notes',
                note.id,
                sourceMeta
              )} references missing movement "${targetId}".`
            );
          }
          return;
        }
        const target = collectionIndexes[mappedCollection].get(targetId);
        if (!target || target.movementId !== mId) {
          throw new Error(
            `Note ${formatRefMessage(
              'notes',
              note.id,
              sourceMeta
            )} references missing ${mappedCollection} "${targetId}".`
          );
        }
      });
    });

    return normalized;
  }

  function assertCount(actual, expected, label) {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} ${label}, found ${actual}`);
    }
  }

  function verifyCatholicImport(snapshot) {
    const validated = validateIncomingSnapshot(snapshot);
    assertCount(validated.movements.length, 1, 'movements');
    const movement = validated.movements.find(m => m.id === 'mov-catholic');
    if (!movement) {
      throw new Error('Movement mov-catholic was not imported.');
    }
    if (
      !movement.name ||
      !movement.name.toLowerCase().includes('catholic church')
    ) {
      throw new Error('Movement name must include "Catholic Church".');
    }

    const byMovement = coll =>
      (validated[coll] || []).filter(item => item.movementId === movement.id);

    assertCount(byMovement('texts').length, 13, 'texts');
    const levelCounts = byMovement('texts').reduce((acc, text) => {
      const level = (text.level || '').toLowerCase();
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
    assertCount(levelCounts.work || 0, 4, 'texts with level=work');
    assertCount(levelCounts.section || 0, 1, 'texts with level=section');
    assertCount(levelCounts.passage || 0, 7, 'texts with level=passage');
    assertCount(levelCounts.line || 0, 1, 'texts with level=line');

    assertCount(byMovement('textCollections').length, 2, 'text collections');
    assertCount(byMovement('entities').length, 23, 'entities');
    assertCount(byMovement('practices').length, 7, 'practices');
    assertCount(byMovement('events').length, 8, 'events');
    assertCount(byMovement('rules').length, 4, 'rules');
    assertCount(byMovement('claims').length, 8, 'claims');
    assertCount(byMovement('media').length, 5, 'media items');
    assertCount(byMovement('notes').length, 2, 'notes');

    const jesus = byMovement('entities').find(e => e.id === 'ent-jesus-christ');
    if (!jesus || jesus.name !== 'Jesus Christ') {
      throw new Error('Entity ent-jesus-christ must exist with name "Jesus Christ".');
    }
    const practice = byMovement('practices').find(p => p.id === 'pr-sunday-mass');
    if (!practice || practice.name !== 'Sunday Mass') {
      throw new Error('Practice pr-sunday-mass must exist with name "Sunday Mass".');
    }
    const event = byMovement('events').find(e => e.id === 'ev-sunday-mass');
    if (!event || event.name !== 'Sunday Mass') {
      throw new Error('Event ev-sunday-mass must exist with name "Sunday Mass".');
    }
    const shelf = byMovement('textCollections').find(tc => tc.id === 'tc-catechism');
    if (!shelf || shelf.name !== 'Catechism of the Catholic Church') {
      throw new Error(
        'Text collection tc-catechism must exist with name "Catechism of the Catholic Church".'
      );
    }
    const nicene = byMovement('texts').find(t => t.id === 'txt-nicene-creed');
    if (!nicene || !nicene.content || !nicene.content.includes('I believe in one God')) {
      throw new Error(
        'Text txt-nicene-creed must include markdown content containing "I believe in one God".'
      );
    }

    return true;
  }

  async function importMovementRepo(rawUrl) {
    const repoInfo = normaliseGithubRepoUrl(rawUrl);
    const ref = await resolveRef(repoInfo);
    const zipBuffer = await downloadRepoZip(repoInfo.owner, repoInfo.repo, ref);
    const zip = await JSZip.loadAsync(zipBuffer);
    const rootPrefix = detectZipRootPrefix(zip);
    const fileIndex = buildFileIndex(zip, rootPrefix);
    const { incoming, sourceMeta } = await buildIncomingSnapshotFromZip(
      fileIndex,
      repoInfo,
      ref
    );
    const validated = validateIncomingSnapshot(incoming, sourceMeta);
    return { snapshot: validated, sourceMeta, repoInfo: { ...repoInfo, ref } };
  }

  window.validateIncomingSnapshot = validateIncomingSnapshot;
  window.verifyCatholicImport = verifyCatholicImport;
  window.GitHubRepoImporter = {
    importMovementRepo,
    normaliseGithubRepoUrl
  };
})();
