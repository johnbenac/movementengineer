(function () {
  'use strict';

  const COLLECTIONS = [
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

  const COLLECTION_BY_DIR = {
    entities: 'entities',
    practices: 'practices',
    events: 'events',
    rules: 'rules',
    claims: 'claims',
    textCollections: 'textCollections',
    texts: 'texts',
    media: 'media',
    notes: 'notes'
  };

  const TYPE_BY_COLLECTION = {
    entities: 'entity',
    practices: 'practice',
    events: 'event',
    rules: 'rule',
    claims: 'claim',
    textCollections: 'textCollection',
    texts: 'text',
    media: 'media',
    notes: 'note'
  };

  const TARGET_COLLECTION_BY_NOTE_TYPE = {
    Entity: 'entities',
    Practice: 'practices',
    Event: 'events',
    TextNode: 'texts',
    Rule: 'rules',
    Claim: 'claims',
    Media: 'media'
  };

  function formatPath(path) {
    return path.replace(/\\/g, '/');
  }

  function parseGitHubRepoUrl(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('GitHub repo URL is required.');
    }
    const trimmed = input.trim();
    const regex =
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+))?\/?$/i;
    const match = trimmed.match(regex);
    if (!match) {
      throw new Error('Invalid GitHub repository URL. Expected https://github.com/{owner}/{repo}');
    }
    const [, owner, repo, ref] = match;
    return {
      owner,
      repo,
      ref: ref || null,
      normalizedUrl: `https://github.com/${owner}/${repo}${ref ? `/tree/${ref}` : ''}`
    };
  }

  async function resolveRef(meta) {
    if (meta.ref) return meta.ref;

    const repoUrl = `https://api.github.com/repos/${meta.owner}/${meta.repo}`;
    let defaultBranch = null;
    try {
      const resp = await fetch(repoUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      defaultBranch = data.default_branch;
    } catch (err) {
      console.warn('Failed to resolve default branch from API, trying fallbacks:', err);
    }

    const candidates = defaultBranch ? [defaultBranch] : [];
    if (!candidates.includes('main')) candidates.push('main');
    if (!candidates.includes('master')) candidates.push('master');
    for (const candidate of candidates) {
      try {
        const url = `https://api.github.com/repos/${meta.owner}/${meta.repo}/branches/${candidate}`;
        const resp = await fetch(url);
        if (resp.ok) return candidate;
      } catch (e) {
        // ignore, try next
      }
    }
    throw new Error('Could not determine branch/ref');
  }

  async function fetchZipball(meta, ref) {
    const url = `https://api.github.com/repos/${meta.owner}/${meta.repo}/zipball/${ref}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 403) {
        throw new Error(`GitHub rate limit or access denied (${resp.status} ${resp.statusText})`);
      }
      throw new Error(`Failed to download zipball: ${resp.status} ${resp.statusText}`);
    }
    return resp.arrayBuffer();
  }

  function detectCommonPrefix(zip) {
    const names = Object.keys(zip.files);
    if (!names.length) return '';
    const segments = names
      .filter(n => !zip.files[n].dir)
      .map(name => formatPath(name).split('/'));
    if (!segments.length) return '';
    let prefix = segments[0];
    for (const parts of segments.slice(1)) {
      const len = Math.min(prefix.length, parts.length);
      let i = 0;
      for (; i < len; i += 1) {
        if (prefix[i] !== parts[i]) break;
      }
      prefix = prefix.slice(0, i);
      if (!prefix.length) break;
    }
    return prefix.length ? `${prefix.join('/')}/` : '';
  }

  function readJsonFile(zip, path) {
    const file = zip.file(path);
    if (!file) {
      throw new Error(`Missing file: ${path}`);
    }
    return file.async('string').then(str => {
      try {
        return JSON.parse(str);
      } catch (err) {
        throw new Error(`Invalid JSON in ${path}: ${err.message}`);
      }
    });
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function buildError(message, filePath) {
    return filePath ? `${message} (source: ${filePath})` : message;
  }

  function ensureMovementValid(data, filePath) {
    if (!data || typeof data !== 'object') {
      throw new Error(buildError('movement.json must be an object', filePath));
    }
    if (data.schema !== 'movement-repo-v1') {
      throw new Error(buildError('movement.json schema must be "movement-repo-v1"', filePath));
    }
    if (!data.movement || typeof data.movement !== 'object') {
      throw new Error(buildError('movement.json missing movement object', filePath));
    }
    const { id, name, shortName, summary, tags } = data.movement;
    if (!isNonEmptyString(id)) {
      throw new Error(buildError('movement.id must be a non-empty string', filePath));
    }
    if (!isNonEmptyString(name)) {
      throw new Error(buildError('movement.name must be a non-empty string', filePath));
    }
    if (shortName != null && typeof shortName !== 'string') {
      throw new Error(buildError('movement.shortName must be a string when present', filePath));
    }
    if (summary != null && typeof summary !== 'string') {
      throw new Error(buildError('movement.summary must be a string when present', filePath));
    }
    if (!Array.isArray(tags)) {
      throw new Error(buildError('movement.tags must be an array', filePath));
    }
  }

  function normaliseTextContent(record, mdContent, filePath) {
    const inline = record.content;
    const hasInline = inline != null && `${inline}`.length > 0;
    const hasMd = typeof mdContent === 'string';

    if (hasInline && hasMd) {
      throw new Error(
        buildError(
          'Text JSON has inline content and a matching markdown file; remove one source of truth',
          filePath
        )
      );
    }
    if (!hasInline && hasMd) {
      record.content = mdContent;
    }
    if (record.body && !record.content) {
      record.content = record.body;
    }
    delete record.body;
  }

  function validateRecord(record, collectionName, movementId, filePath) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(buildError('Record must be an object', filePath));
    }
    if (!isNonEmptyString(record.id)) {
      throw new Error(buildError('Record is missing a non-empty id', filePath));
    }
    if (!isNonEmptyString(record.movementId)) {
      throw new Error(buildError('Record is missing movementId', filePath));
    }
    if (record.movementId !== movementId) {
      throw new Error(
        buildError(
          `movementId mismatch: expected ${movementId}, found ${record.movementId}`,
          filePath
        )
      );
    }
    const expectedType = TYPE_BY_COLLECTION[collectionName];
    if (expectedType) {
      if (!record.type) {
        throw new Error(
          buildError(`Record is missing type "${expectedType}" for ${collectionName}`, filePath)
        );
      }
      if (record.type !== expectedType) {
        throw new Error(
          buildError(
            `Type mismatch: expected "${expectedType}" for ${collectionName} but found "${record.type}"`,
            filePath
          )
        );
      }
      delete record.type;
    }
  }

  function collectFiles(zip, prefix) {
    const files = [];
    Object.keys(zip.files).forEach(name => {
      const normalized = formatPath(name);
      if (zip.files[name].dir) return;
      if (!normalized.startsWith(prefix)) return;
      files.push(normalized.slice(prefix.length));
    });
    return files;
  }

  function buildFileLookup() {
    const lookup = {};
    COLLECTIONS.forEach(c => {
      lookup[c] = new Map();
    });
    return lookup;
  }

  function registerPath(lookup, collection, id, path) {
    if (!lookup[collection]) lookup[collection] = new Map();
    lookup[collection].set(id, path);
  }

  function filePathFor(lookup, collection, id) {
    return lookup?.[collection]?.get(id) || null;
  }

  function buildReferenceError(message, collection, id, lookup) {
    const path = filePathFor(lookup, collection, id);
    return buildError(message, path || undefined);
  }

  function validateCrossReferences(snapshot, lookup) {
    const movementIds = new Set((snapshot.movements || []).map(m => m.id));
    const byMovement = {};
    COLLECTIONS.forEach(name => {
      snapshot[name] = Array.isArray(snapshot[name]) ? snapshot[name] : [];
      snapshot[name].forEach(item => {
        if (name !== 'movements' && item && item.movementId && !movementIds.has(item.movementId)) {
          throw new Error(
            buildReferenceError(
              `${name} ${item.id} references unknown movementId ${item.movementId}`,
              name,
              item.id,
              lookup
            )
          );
        }
        if (!item || !item.movementId) return;
        if (!byMovement[item.movementId]) {
          byMovement[item.movementId] = {};
          COLLECTIONS.forEach(c => {
            byMovement[item.movementId][c] = new Map();
          });
        }
        byMovement[item.movementId][name].set(item.id, item);
      });
    });

    Object.entries(byMovement).forEach(([movementId, collections]) => {
      const get = (collection, id) => collections[collection]?.get(id);

      const assertRefs = (collection, id, field, ids, targetCollection) => {
        if (!ids) return;
        ids.forEach(refId => {
          if (!get(targetCollection, refId)) {
            throw new Error(
              buildReferenceError(
                `${collection} ${id} is missing referenced ${field}: ${refId}`,
                collection,
                id,
                lookup
              )
            );
          }
        });
      };

      collections.texts.forEach(text => {
        if (text.parentId && !get('texts', text.parentId)) {
          throw new Error(
            buildReferenceError(
              `texts ${text.id} parentId not found: ${text.parentId}`,
              'texts',
              text.id,
              lookup
            )
          );
        }
        assertRefs('texts', text.id, 'mentionsEntityIds', text.mentionsEntityIds || [], 'entities');
      });

      collections.textCollections.forEach(tc => {
        assertRefs('textCollections', tc.id, 'rootTextIds', tc.rootTextIds || [], 'texts');
      });

      collections.practices.forEach(p => {
        assertRefs('practices', p.id, 'involvedEntityIds', p.involvedEntityIds || [], 'entities');
        assertRefs('practices', p.id, 'instructionsTextIds', p.instructionsTextIds || [], 'texts');
        assertRefs('practices', p.id, 'supportingClaimIds', p.supportingClaimIds || [], 'claims');
        assertRefs('practices', p.id, 'sourceEntityIds', p.sourceEntityIds || [], 'entities');
      });

      collections.events.forEach(ev => {
        assertRefs('events', ev.id, 'mainPracticeIds', ev.mainPracticeIds || [], 'practices');
        assertRefs('events', ev.id, 'mainEntityIds', ev.mainEntityIds || [], 'entities');
        assertRefs('events', ev.id, 'readingTextIds', ev.readingTextIds || [], 'texts');
        assertRefs('events', ev.id, 'supportingClaimIds', ev.supportingClaimIds || [], 'claims');
      });

      collections.rules.forEach(rule => {
        assertRefs('rules', rule.id, 'supportingTextIds', rule.supportingTextIds || [], 'texts');
        assertRefs('rules', rule.id, 'supportingClaimIds', rule.supportingClaimIds || [], 'claims');
        assertRefs('rules', rule.id, 'relatedPracticeIds', rule.relatedPracticeIds || [], 'practices');
        assertRefs('rules', rule.id, 'sourceEntityIds', rule.sourceEntityIds || [], 'entities');
      });

      collections.claims.forEach(claim => {
        assertRefs('claims', claim.id, 'sourceTextIds', claim.sourceTextIds || [], 'texts');
        assertRefs('claims', claim.id, 'aboutEntityIds', claim.aboutEntityIds || [], 'entities');
        assertRefs('claims', claim.id, 'sourceEntityIds', claim.sourceEntityIds || [], 'entities');
      });

      collections.media.forEach(media => {
        assertRefs('media', media.id, 'linkedEntityIds', media.linkedEntityIds || [], 'entities');
        assertRefs(
          'media',
          media.id,
          'linkedPracticeIds',
          media.linkedPracticeIds || [],
          'practices'
        );
        assertRefs('media', media.id, 'linkedEventIds', media.linkedEventIds || [], 'events');
        assertRefs('media', media.id, 'linkedTextIds', media.linkedTextIds || [], 'texts');
      });

      collections.notes.forEach(note => {
        const targetCollection = TARGET_COLLECTION_BY_NOTE_TYPE[note.targetType];
        if (!targetCollection) {
          throw new Error(
            buildReferenceError(
              `notes ${note.id} has unsupported targetType: ${note.targetType}`,
              'notes',
              note.id,
              lookup
            )
          );
        }
        if (!get(targetCollection, note.targetId)) {
          throw new Error(
            buildReferenceError(
              `notes ${note.id} target not found: ${note.targetType} ${note.targetId}`,
              'notes',
              note.id,
              lookup
            )
          );
        }
      });
    });
  }

  function validateIncomingSnapshot(incomingSnapshot, options = {}) {
    const snapshot = window.StorageService
      ? StorageService.ensureAllCollections(
          JSON.parse(JSON.stringify(incomingSnapshot || StorageService.createEmptySnapshot()))
        )
      : incomingSnapshot;
    const lookup = options.fileLookup || buildFileLookup();
    validateCrossReferences(snapshot, lookup);
    return snapshot;
  }

  async function parseMovementFromZip(zip, movementJsonPath, prefix, fileLookup) {
    const movementFolder = movementJsonPath
      .replace(/\/movement\.json$/, '')
      .replace(/^movements\//, '');
    const movementData = await readJsonFile(zip, `${prefix}${movementJsonPath}`);
    ensureMovementValid(movementData, movementJsonPath);
    const movementId = movementData.movement.id;

    const movementSnapshot = StorageService.createEmptySnapshot();
    movementSnapshot.version = '3.6';
    movementSnapshot.movements.push(movementData.movement);
    registerPath(fileLookup, 'movements', movementId, movementJsonPath);

    const files = collectFiles(zip, prefix).filter(path =>
      path.startsWith(`movements/${movementFolder}/`)
    );
    const mdFiles = new Set(
      files.filter(p => p.startsWith(`movements/${movementFolder}/texts/`) && p.endsWith('.md'))
    );

    for (const relPath of files) {
      if (relPath === movementJsonPath) continue;
      const parts = relPath.split('/');
      if (parts.length < 3) continue;
      const dir = parts[2];
      const collection = COLLECTION_BY_DIR[dir];
      if (!collection) continue;
      if (!relPath.endsWith('.json')) continue;
      const record = await readJsonFile(zip, `${prefix}${relPath}`);
      const filePath = relPath;

      validateRecord(record, collection, movementId, filePath);
      if (collection === 'texts') {
        const base = relPath.replace(/\.json$/, '');
        const mdPath = `${base}.md`;
        const hasMd = mdFiles.has(mdPath);
        let mdContent = null;
        if (hasMd) {
          mdContent = await zip.file(`${prefix}${mdPath}`).async('string');
          mdFiles.delete(mdPath);
        }
        normaliseTextContent(record, mdContent, filePath);
      }

      const target = movementSnapshot[collection];
      const duplicate = target.find(item => item.id === record.id);
      if (duplicate) {
        throw new Error(
          buildError(
            `Duplicate id "${record.id}" found in ${collection}`,
            filePathFor(fileLookup, collection, record.id) || filePath
          )
        );
      }
      target.push(record);
      registerPath(fileLookup, collection, record.id, filePath);
    }

    if (mdFiles.size) {
      const dangling = Array.from(mdFiles)[0];
      throw new Error(buildError(`Dangling markdown file without JSON: ${dangling}`, dangling));
    }

    return movementSnapshot;
  }

  function mergeSnapshots(snapshots) {
    const merged = StorageService.ensureAllCollections({});
    merged.version = '3.6';
    snapshots.forEach(s => {
      COLLECTIONS.forEach(coll => {
        merged[coll] = merged[coll].concat(s[coll] || []);
      });
    });
    return merged;
  }

  async function importMovementRepo(url) {
    const parsed = parseGitHubRepoUrl(url);
    const ref = await resolveRef(parsed);
    const zipBuffer = await fetchZipball(parsed, ref);
    const zip = await JSZip.loadAsync(zipBuffer);
    const prefix = detectCommonPrefix(zip);
    const files = collectFiles(zip, prefix);
    const movementManifests = files.filter(
      path => path.startsWith('movements/') && path.endsWith('/movement.json')
    );
    if (!movementManifests.length) {
      throw new Error('No movements found in repository (expected movements/<name>/movement.json)');
    }

    const perMovementSnapshots = [];
    const fileLookup = buildFileLookup();
    for (const manifest of movementManifests) {
      const snapshot = await parseMovementFromZip(zip, manifest, prefix, fileLookup);
      perMovementSnapshots.push(snapshot);
    }

    const incomingSnapshot = mergeSnapshots(perMovementSnapshots);
    validateIncomingSnapshot(incomingSnapshot, { fileLookup });

    return {
      snapshot: incomingSnapshot,
      meta: { ...parsed, ref }
    };
  }

  function verifyCatholicImport(snapshot) {
    validateIncomingSnapshot(snapshot);
    const expectations = {
      movements: 1,
      texts: 13,
      textCollections: 2,
      entities: 23,
      practices: 7,
      events: 8,
      rules: 4,
      claims: 8,
      media: 5,
      notes: 2
    };
    const movement = (snapshot.movements || [])[0];
    if (!movement || movement.id !== 'mov-catholic' || movement.name !== 'Catholic Church') {
      throw new Error('Movement metadata does not match expected Catholic Church record.');
    }
    Object.entries(expectations).forEach(([coll, expected]) => {
      const actual = Array.isArray(snapshot[coll]) ? snapshot[coll].length : 0;
      if (actual !== expected) {
        throw new Error(`Expected ${expected} ${coll}, found ${actual}`);
      }
    });

    const works = (snapshot.texts || []).filter(t => t.mainFunction === 'work').length;
    if (works !== 4) throw new Error(`Expected 4 works, found ${works}`);
    const sections = (snapshot.texts || []).filter(t => t.mainFunction === 'section').length;
    if (sections !== 1) throw new Error(`Expected 1 section, found ${sections}`);
    const passages = (snapshot.texts || []).filter(t => t.mainFunction === 'passage').length;
    if (passages !== 7) throw new Error(`Expected 7 passages, found ${passages}`);
    const lines = (snapshot.texts || []).filter(t => t.mainFunction === 'line').length;
    if (lines !== 1) throw new Error(`Expected 1 line, found ${lines}`);

    const jesus = snapshot.entities.find(e => e.id === 'ent-jesus-christ');
    if (!jesus || jesus.name !== 'Jesus Christ') {
      throw new Error('Entity ent-jesus-christ with name "Jesus Christ" is missing or incorrect.');
    }
    const sundayPractice = snapshot.practices.find(p => p.id === 'pr-sunday-mass');
    if (!sundayPractice || sundayPractice.name !== 'Sunday Mass') {
      throw new Error('Practice pr-sunday-mass is missing or incorrect.');
    }
    const sundayEvent = snapshot.events.find(e => e.id === 'ev-sunday-mass');
    if (!sundayEvent || sundayEvent.name !== 'Sunday Mass') {
      throw new Error('Event ev-sunday-mass is missing or incorrect.');
    }
    const catechismShelf = snapshot.textCollections.find(tc => tc.id === 'tc-catechism');
    if (!catechismShelf || catechismShelf.name !== 'Catechism of the Catholic Church') {
      throw new Error('Text collection tc-catechism is missing or incorrect.');
    }
    const nicene = snapshot.texts.find(t => t.id === 'txt-nicene-creed');
    if (!nicene || !nicene.content || !nicene.content.includes('I believe in one God')) {
      throw new Error('Nicene Creed text missing or content does not include expected phrase.');
    }
    return true;
  }

  window.GitHubRepoImporter = {
    importMovementRepo
  };
  window.validateIncomingSnapshot = validateIncomingSnapshot;
  window.verifyCatholicImport = verifyCatholicImport;
})();
