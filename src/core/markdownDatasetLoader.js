(function () {
  'use strict';

  const NOTE_TARGET_TYPES = {
    movement: 'Movement',
    movementnode: 'Movement', // legacy typo safeguard
    textnode: 'TextNode',
    text: 'TextNode',
    entity: 'Entity',
    practice: 'Practice',
    event: 'Event',
    rule: 'Rule',
    claim: 'Claim',
    media: 'MediaAsset',
    mediaasset: 'MediaAsset',
    media_asset: 'MediaAsset'
  };

  const COLLECTION_REFERENCE_RULES = {
    texts: ['mentionsEntityIds'],
    textCollections: ['rootTextIds'],
    practices: ['involvedEntityIds', 'instructionsTextIds', 'supportingClaimIds', 'sourceEntityIds'],
    events: ['mainPracticeIds', 'mainEntityIds', 'readingTextIds', 'supportingClaimIds'],
    rules: ['supportingTextIds', 'supportingClaimIds', 'relatedPracticeIds', 'sourceEntityIds'],
    claims: ['sourceTextIds', 'aboutEntityIds', 'sourceEntityIds'],
    media: ['linkedEntityIds', 'linkedPracticeIds', 'linkedEventIds', 'linkedTextIds']
  };

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function getModelRegistry() {
    if (isNode()) {
      return require('./modelRegistry');
    }
    return globalScope?.ModelRegistry || null;
  }

  function getValidationConfig() {
    if (isNode()) {
      return require('./validation/validationConfig');
    }
    return globalScope?.ValidationConfig || null;
  }

  function getShadowValidation() {
    if (isNode()) {
      return require('./validation/shadowValidation');
    }
    return globalScope?.ShadowValidation || null;
  }

  function getLegacyAdapter() {
    if (isNode()) {
      return require('./validation/legacyAdapter');
    }
    return globalScope?.LegacyValidationAdapter || null;
  }

  const modelRegistry = getModelRegistry();
  if (!modelRegistry?.listCollections) {
    throw new Error('ModelRegistry is not available. Ensure it is loaded before markdownDatasetLoader.');
  }

  const { DEFAULT_SPEC_VERSION, listCollections, getModel } = modelRegistry;

  function resolveSpecVersion(value) {
    return value || DEFAULT_SPEC_VERSION;
  }

  /**
   * @typedef {Object} ExportCollectionSchema
   * @property {string} collectionName
   * @property {string[]} frontMatterFields
   * @property {string | null} bodyField
   */

  function getYamlLib() {
    if (isNode()) return require('js-yaml');
    if (typeof window !== 'undefined' && window.jsyaml) return window.jsyaml;
    throw new Error('YAML parser not available. Ensure js-yaml is loaded.');
  }

  function getZipLib() {
    if (isNode()) return require('jszip');
    if (typeof window !== 'undefined' && window.JSZip) return window.JSZip;
    throw new Error('Zip library not available. Ensure jszip is loaded.');
  }

  let cachedFetch = null;
  function getFetchWithProxy() {
    if (cachedFetch) return cachedFetch;

    if (!isNode()) {
      if (typeof fetch !== 'undefined') {
        cachedFetch = fetch;
        return cachedFetch;
      }
      throw new Error('Fetch API is not available in this environment.');
    }

    try {
      const undici = require('undici');
      const proxyUrl =
        process.env.HTTPS_PROXY ||
        process.env.https_proxy ||
        process.env.HTTP_PROXY ||
        process.env.http_proxy ||
        null;
      if (proxyUrl) {
        const { ProxyAgent, fetch: undiciFetch } = undici;
        const dispatcher = new ProxyAgent(proxyUrl);
        cachedFetch = (url, options = {}) =>
          undiciFetch(url, {
            dispatcher,
            ...options
          });
      } else {
        cachedFetch = undici.fetch;
      }
      return cachedFetch;
    } catch (err) {
      throw new Error(`Fetch API is not available: ${err.message || err}`);
    }
  }

  function fetchWithProxy(url, options) {
    const f = getFetchWithProxy();
    return f(url, options);
  }

  function normaliseArray(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(v => v !== undefined && v !== null);
  }

  function deepClone(value) {
    if (value === null || typeof value !== 'object') return value;
    return JSON.parse(JSON.stringify(value));
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      for (const key of aKeys) {
        if (!deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
    return false;
  }

  function stringOrNull(value) {
    if (typeof value === 'string') return value;
    return value === undefined || value === null ? null : String(value);
  }

  function stringOrEmpty(value) {
    return typeof value === 'string' ? value : '';
  }

  function cleanId(value) {
    const str = stringOrNull(value);
    if (!str) return null;
    const trimmed = str.trim();
    const unwrapped = trimmed.replace(/^\[\[/, '').replace(/\]\]$/, '');
    return unwrapped.trim() || null;
  }

  function normaliseIds(value) {
    return normaliseArray(value)
      .map(cleanId)
      .filter(id => !!id);
  }

  function numberOrNull(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function trimBody(body) {
    if (!body) return '';
    return String(body).trim();
  }

  function renderMarkdown(frontMatter, body) {
    const yaml = getYamlLib();
    const fm = yaml.dump(frontMatter || {}, { lineWidth: -1, noRefs: true });
    const bodyText = body === undefined || body === null ? '' : String(body);
    return `---\n${fm}---\n${bodyText}`;
  }

  function buildBaselineByMovement(data, specVersion) {
    const baseline = {};
    const collectionNames = listCollections(resolveSpecVersion(specVersion || data?.specVersion));
    const movements = normaliseArray(data.movements);
    movements.forEach(movement => {
      const id = movement.id;
      if (!id) return;
      baseline[id] = {};
      collectionNames.forEach(collection => {
        baseline[id][collection] = {};
      });
      baseline[id].movements[movement.id] = deepClone(movement);
    });

    collectionNames.forEach(collection => {
      if (collection === 'movements') return;
      normaliseArray(data[collection]).forEach(item => {
        if (!item || !item.movementId || !baseline[item.movementId]) return;
        baseline[item.movementId][collection][item.id] = deepClone(item);
      });
    });
    return baseline;
  }

  function parseFrontMatter(text, filePath) {
    const content = text || '';
    const frontMatterMatch = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]?([\s\S]*)$/);
    if (!frontMatterMatch) {
      throw new Error(`Missing or invalid YAML front matter in ${filePath}`);
    }
    const [, yamlText, body] = frontMatterMatch;
    const yaml = getYamlLib();
    let data;
    try {
      data = yaml.load(yamlText) || {};
    } catch (e) {
      throw new Error(`Invalid YAML in ${filePath}: ${e.message}`);
    }
    if (typeof data !== 'object' || Array.isArray(data) || data === null) {
      throw new Error(`Front matter must define a YAML object in ${filePath}`);
    }
    return { frontMatter: data, body: body || '' };
  }

  // ------------------------
  // Repo readers
  // ------------------------

  function createLocalRepoReader(rootPath) {
    if (!isNode()) {
      throw new Error('Local filesystem reader is only available in Node environments.');
    }
    const fs = require('fs/promises');
    const path = require('path');
    const base = path.resolve(rootPath || '.');

    async function listFiles(relativeRoot = '') {
      const start = path.resolve(base, relativeRoot);
      if (!start.startsWith(base)) {
        throw new Error('Path traversal detected while listing files.');
      }
      const result = [];
      async function walk(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          const rel = full.slice(base.length + 1).replace(/\\/g, '/');
          if (entry.isDirectory()) {
            await walk(full);
          } else {
            result.push(rel);
          }
        }
      }
      await walk(start);
      return result;
    }

    async function readText(filePath) {
      const full = path.resolve(base, filePath);
      if (!full.startsWith(base)) {
        throw new Error('Path traversal detected while reading file.');
      }
      return fs.readFile(full, 'utf8');
    }

    async function readBinary(filePath) {
      const full = path.resolve(base, filePath);
      if (!full.startsWith(base)) {
        throw new Error('Path traversal detected while reading file.');
      }
      return fs.readFile(full);
    }

    return { listFiles, readText, readBinary };
  }

  function parseGitHubRepoUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new Error('GitHub repo URL is required.');
    }
    let urlStr = rawUrl.trim();
    if (!/^https?:\/\//i.test(urlStr)) {
      urlStr = 'https://' + urlStr;
    }
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (e) {
      throw new Error('Invalid URL. Please provide a valid GitHub repository URL.');
    }
    if (!/github\.com$/i.test(parsed.hostname.replace(/^www\./, ''))) {
      throw new Error('Only github.com URLs are supported.');
    }
    const parts = parsed.pathname.replace(/\.git$/, '').split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error('URL must include both owner and repo, e.g. github.com/owner/repo');
    }
    let ref = null;
    let subdir = '';
    if (parts[2] === 'tree') {
      ref = parts[3] || null;
      subdir = parts.slice(4).join('/');
    }
    return {
      owner: parts[0],
      repo: parts[1],
      ref,
      subdir
    };
  }

  async function fetchJson(url) {
    const res = await fetchWithProxy(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API request failed (${res.status} ${res.statusText}): ${body || url}`);
    }
    return res.json();
  }

  async function resolveGitHubTree(owner, repo, refHint) {
    const repoInfo = await fetchJson(`https://api.github.com/repos/${owner}/${repo}`);
    const ref = refHint || repoInfo.default_branch || 'main';
    const tree = await fetchJson(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`
    );
    const commitSha = ref;
    return { tree, ref, commitSha };
  }

  function createGitHubRepoReader(config) {
    const parsed = parseGitHubRepoUrl(config.repoUrl);
    const subdir = (config.subdir || parsed.subdir || '').replace(/^\/+|\/+$/g, '');
    const refOverride = config.ref || parsed.ref || null;

    async function listFiles(rootPath = '') {
      let treeInfo;
      try {
        treeInfo = await resolveGitHubTree(parsed.owner, parsed.repo, refOverride);
      } catch (err) {
        throw new Error(`Failed to list files from GitHub: ${err.message || err}`);
      }
      const { tree, ref, commitSha } = treeInfo;
      const basePrefix = [subdir, rootPath].filter(Boolean).join('/');
      const files = Array.isArray(tree.tree) ? tree.tree : [];
      const filtered = files
        .filter(entry => entry && entry.type === 'blob' && typeof entry.path === 'string')
        .map(entry => entry.path);
      const scoped = filtered.filter(path => (basePrefix ? path.startsWith(basePrefix + '/') : true));
      return { files: scoped, ref, commitSha };
    }

    async function readText(filePath, ref, commitSha) {
      const baseRef = commitSha || ref || refOverride || 'main';
      const prefix = subdir ? `${subdir}/` : '';
      const path = `${prefix}${filePath}`.replace(/\/{2,}/g, '/');
      const url = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${baseRef}/${path}`;
      const res = await fetchWithProxy(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${path} (${res.status} ${res.statusText}).`);
      }
      return res.text();
    }

    async function readBinary(filePath, ref, commitSha) {
      const baseRef = commitSha || ref || refOverride || 'main';
      const prefix = subdir ? `${subdir}/` : '';
      const path = `${prefix}${filePath}`.replace(/\/{2,}/g, '/');
      const url = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${baseRef}/${path}`;
      const res = await fetchWithProxy(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${path} (${res.status} ${res.statusText}).`);
      }
      const arrayBuffer = await res.arrayBuffer();
      return isNode() ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer);
    }

    function getRepoInfo() {
      return {
        source: 'github',
        owner: parsed.owner,
        repo: parsed.repo,
        subdir,
        ref: refOverride || null
      };
    }

    return { listFiles, readText, readBinary, getRepoInfo };
  }

  // ------------------------
  // Compiler helpers
  // ------------------------

  function ensureDataShape(specVersion) {
    const data = {};
    const collectionNames = listCollections(resolveSpecVersion(specVersion));
    collectionNames.forEach(name => {
      data[name] = [];
    });
    return data;
  }

  function compileMovement(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const name = stringOrNull(frontMatter.name);
    if (!id || !name) {
      throw new Error(`Movement is missing required id or name (${filePath})`);
    }
    return {
      id,
      movementId: cleanId(frontMatter.movementId) || id,
      name,
      shortName: stringOrNull(frontMatter.shortName),
      tags: normaliseArray(frontMatter.tags).map(String),
      summary: trimBody(body),
      status: stringOrNull(frontMatter.status),
      order: numberOrNull(frontMatter.order)
    };
  }

  function compileTextCollection(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const name = stringOrNull(frontMatter.name);
    if (!id || !movementId || !name) {
      throw new Error(`TextCollection missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      name,
      rootTextIds: normaliseIds(frontMatter.rootTextIds),
      description: trimBody(body),
      tags: normaliseArray(frontMatter.tags).map(String),
      order: numberOrNull(frontMatter.order)
    };
  }

  function compileText(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const title = stringOrNull(frontMatter.title);
    if (!id || !movementId || !title) {
      throw new Error(`Text missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      title,
      label: stringOrNull(frontMatter.label),
      parentId: cleanId(frontMatter.parentId),
      mainFunction: stringOrNull(frontMatter.mainFunction),
      tags: normaliseArray(frontMatter.tags).map(String),
      mentionsEntityIds: normaliseIds(frontMatter.mentionsEntityIds),
      order: numberOrNull(frontMatter.order),
      content: trimBody(body)
    };
  }

  function compileEntity(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const name = stringOrNull(frontMatter.name);
    if (!id || !movementId || !name) {
      throw new Error(`Entity missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      name,
      kind: stringOrNull(frontMatter.kind),
      tags: normaliseArray(frontMatter.tags).map(String),
      sourceEntityIds: normaliseIds(frontMatter.sourceEntityIds),
      sourcesOfTruth: normaliseArray(frontMatter.sourcesOfTruth).map(String),
      order: numberOrNull(frontMatter.order),
      summary: trimBody(body)
    };
  }

  function compilePractice(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const name = stringOrNull(frontMatter.name);
    if (!id || !movementId || !name) {
      throw new Error(`Practice missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      name,
      kind: stringOrNull(frontMatter.kind),
      frequency: stringOrNull(frontMatter.frequency),
      tags: normaliseArray(frontMatter.tags).map(String),
      involvedEntityIds: normaliseIds(frontMatter.involvedEntityIds),
      instructionsTextIds: normaliseIds(frontMatter.instructionsTextIds),
      supportingClaimIds: normaliseIds(frontMatter.supportingClaimIds),
      sourceEntityIds: normaliseIds(frontMatter.sourceEntityIds),
      sourcesOfTruth: normaliseArray(frontMatter.sourcesOfTruth).map(String),
      order: numberOrNull(frontMatter.order),
      description: trimBody(body)
    };
  }

  function compileEvent(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const name = stringOrNull(frontMatter.name);
    if (!id || !movementId || !name) {
      throw new Error(`Event missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      name,
      recurrence: stringOrNull(frontMatter.recurrence),
      timingRule: stringOrNull(frontMatter.timingRule),
      tags: normaliseArray(frontMatter.tags).map(String),
      mainPracticeIds: normaliseIds(frontMatter.mainPracticeIds),
      mainEntityIds: normaliseIds(frontMatter.mainEntityIds),
      readingTextIds: normaliseIds(frontMatter.readingTextIds),
      supportingClaimIds: normaliseIds(frontMatter.supportingClaimIds),
      order: numberOrNull(frontMatter.order),
      description: trimBody(body)
    };
  }

  function compileRule(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const shortText = stringOrNull(frontMatter.shortText);
    const kind = frontMatter.kind === undefined ? null : stringOrNull(frontMatter.kind);
    if (!id || !movementId || !shortText) {
      throw new Error(`Rule missing required fields (${filePath})`);
    }
    const detailsFromBody = trimBody(body);
    const detailsField = frontMatter.details === undefined ? detailsFromBody : stringOrNull(frontMatter.details);
    return {
      id,
      movementId,
      shortText,
      kind,
      details: detailsField === null ? null : stringOrEmpty(detailsField),
      appliesTo: normaliseArray(frontMatter.appliesTo).map(String),
      domain: normaliseArray(frontMatter.domain).map(String),
      tags: normaliseArray(frontMatter.tags).map(String),
      supportingTextIds: normaliseIds(frontMatter.supportingTextIds),
      supportingClaimIds: normaliseIds(frontMatter.supportingClaimIds),
      relatedPracticeIds: normaliseIds(frontMatter.relatedPracticeIds),
      sourceEntityIds: normaliseIds(frontMatter.sourceEntityIds),
      sourcesOfTruth: normaliseArray(frontMatter.sourcesOfTruth).map(String),
      order: numberOrNull(frontMatter.order)
    };
  }

  function compileClaim(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const text = stringOrNull(frontMatter.text) || trimBody(body);
    if (!id || !movementId || !text) {
      throw new Error(`Claim missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      text,
      category: stringOrNull(frontMatter.category),
      tags: normaliseArray(frontMatter.tags).map(String),
      aboutEntityIds: normaliseIds(frontMatter.aboutEntityIds),
      sourceTextIds: normaliseIds(frontMatter.sourceTextIds),
      sourceEntityIds: normaliseIds(frontMatter.sourceEntityIds),
      sourcesOfTruth: normaliseArray(frontMatter.sourcesOfTruth).map(String),
      order: numberOrNull(frontMatter.order)
    };
  }

  function compileMedia(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const kind = stringOrNull(frontMatter.kind);
    const uri = stringOrNull(frontMatter.uri);
    if (!id || !movementId || !kind || !uri) {
      throw new Error(`Media asset missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      kind,
      uri,
      title: stringOrNull(frontMatter.title),
      tags: normaliseArray(frontMatter.tags).map(String),
      linkedEntityIds: normaliseIds(frontMatter.linkedEntityIds),
      linkedPracticeIds: normaliseIds(frontMatter.linkedPracticeIds),
      linkedEventIds: normaliseIds(frontMatter.linkedEventIds),
      linkedTextIds: normaliseIds(frontMatter.linkedTextIds),
      order: numberOrNull(frontMatter.order),
      description: trimBody(body)
    };
  }

  function compileNote(frontMatter, body, filePath) {
    const id = cleanId(frontMatter.id);
    const movementId = cleanId(frontMatter.movementId);
    const rawTarget = frontMatter.targetType;
    const targetId = cleanId(frontMatter.targetId);
    if (!id || !movementId || !rawTarget || !targetId) {
      throw new Error(`Note missing required fields (${filePath})`);
    }
    const canonical = NOTE_TARGET_TYPES[String(rawTarget).replace(/[\s_]/g, '').toLowerCase()];
    if (!canonical) {
      throw new Error(
        `Invalid note targetType "${rawTarget}" in ${filePath}. Expected one of: ${Object.values(NOTE_TARGET_TYPES)
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(', ')}`
      );
    }
    return {
      id,
      movementId,
      targetType: canonical,
      targetId,
      author: stringOrNull(frontMatter.author),
      context: stringOrNull(frontMatter.context),
      tags: normaliseArray(frontMatter.tags).map(String),
      order: numberOrNull(frontMatter.order),
      body: trimBody(body)
    };
  }

  const COMPILERS = {
    movements: compileMovement,
    textCollections: compileTextCollection,
    texts: compileText,
    entities: compileEntity,
    practices: compilePractice,
    events: compileEvent,
    rules: compileRule,
    claims: compileClaim,
    media: compileMedia,
    notes: compileNote
  };

  function sortCollection(items) {
    return items
      .slice()
      .sort((a, b) => {
        const ao = a.order ?? null;
        const bo = b.order ?? null;
        if (ao === null && bo !== null) return 1;
        if (ao !== null && bo === null) return -1;
        if (ao !== null && bo !== null && ao !== bo) return ao - bo;
        return String(a.id).localeCompare(String(b.id));
      });
  }

  function validateDuplicates(data, collectionNames) {
    collectionNames.forEach(collection => {
      const seen = new Set();
      data[collection].forEach(item => {
        if (seen.has(item.id)) {
          throw new Error(`Duplicate id detected in ${collection}: ${item.id}`);
        }
        seen.add(item.id);
      });
    });
  }

  function validateMovementLinks(data, collectionNames) {
    const movementIds = new Set(data.movements.map(m => m.id));
    data.movements.forEach(movement => {
      if (movement.movementId !== movement.id) {
        throw new Error(`Movement ${movement.id} must set movementId equal to id.`);
      }
    });

    collectionNames.forEach(collection => {
      if (collection === 'movements') return;
      data[collection].forEach(item => {
        if (!movementIds.has(item.movementId)) {
          throw new Error(
            `${collection}/${item.id} references unknown movementId ${item.movementId}`
          );
        }
      });
    });
  }

  function buildMovementIndexes(data, collectionNames) {
    const byMovement = {};
    data.movements.forEach(movement => {
      byMovement[movement.id] = {};
      collectionNames.forEach(collection => {
        byMovement[movement.id][collection] = [];
      });
    });

    collectionNames.forEach(collection => {
      if (collection === 'movements') return;
      data[collection].forEach(item => {
        if (!byMovement[item.movementId]) return;
        byMovement[item.movementId][collection].push(item);
      });
    });
    return byMovement;
  }

  function assertRef(collectionName, fromId, field, targetId, exists, filePath) {
    if (!exists) {
      throw new Error(
        `Missing reference: ${collectionName}/${fromId} ${field} -> ${targetId}${filePath ? ` (source: ${filePath})` : ''}`
      );
    }
  }

  function validateReferences(data, fileIndex, collectionNames) {
    const byMovement = buildMovementIndexes(data, collectionNames);
    Object.entries(byMovement).forEach(([movementId, collections]) => {
      const textIds = new Set(collections.texts.map(t => t.id));
      const entityIds = new Set(collections.entities.map(e => e.id));
      const practiceIds = new Set(collections.practices.map(p => p.id));
      const claimIds = new Set(collections.claims.map(c => c.id));
      const eventIds = new Set(collections.events.map(e => e.id));
      const textCollectionIds = new Set(collections.textCollections.map(tc => tc.id));
      const mediaIds = new Set(collections.media.map(m => m.id));
      const noteIds = new Set(collections.notes.map(n => n.id));
      const movementExists = !!data.movements.find(m => m.id === movementId);

      collections.texts.forEach(text => {
        if (text.parentId) {
          assertRef('texts', text.id, 'parentId', text.parentId, textIds.has(text.parentId), fileIndex.get(`texts:${text.id}`));
        }
        text.mentionsEntityIds.forEach(id => {
          assertRef('texts', text.id, 'mentionsEntityIds', id, entityIds.has(id), fileIndex.get(`texts:${text.id}`));
        });
      });

      collections.textCollections.forEach(tc => {
        tc.rootTextIds.forEach(id => {
          assertRef('textCollections', tc.id, 'rootTextIds', id, textIds.has(id), fileIndex.get(`textCollections:${tc.id}`));
        });
      });

      collections.practices.forEach(practice => {
        practice.involvedEntityIds.forEach(id => {
          assertRef('practices', practice.id, 'involvedEntityIds', id, entityIds.has(id), fileIndex.get(`practices:${practice.id}`));
        });
        practice.instructionsTextIds.forEach(id => {
          assertRef('practices', practice.id, 'instructionsTextIds', id, textIds.has(id), fileIndex.get(`practices:${practice.id}`));
        });
        practice.supportingClaimIds.forEach(id => {
          assertRef('practices', practice.id, 'supportingClaimIds', id, claimIds.has(id), fileIndex.get(`practices:${practice.id}`));
        });
        practice.sourceEntityIds.forEach(id => {
          assertRef('practices', practice.id, 'sourceEntityIds', id, entityIds.has(id), fileIndex.get(`practices:${practice.id}`));
        });
      });

      collections.events.forEach(event => {
        event.mainPracticeIds.forEach(id => {
          assertRef('events', event.id, 'mainPracticeIds', id, practiceIds.has(id), fileIndex.get(`events:${event.id}`));
        });
        event.mainEntityIds.forEach(id => {
          assertRef('events', event.id, 'mainEntityIds', id, entityIds.has(id), fileIndex.get(`events:${event.id}`));
        });
        event.readingTextIds.forEach(id => {
          assertRef('events', event.id, 'readingTextIds', id, textIds.has(id), fileIndex.get(`events:${event.id}`));
        });
        event.supportingClaimIds.forEach(id => {
          assertRef('events', event.id, 'supportingClaimIds', id, claimIds.has(id), fileIndex.get(`events:${event.id}`));
        });
      });

      collections.rules.forEach(rule => {
        rule.supportingTextIds.forEach(id => {
          assertRef('rules', rule.id, 'supportingTextIds', id, textIds.has(id), fileIndex.get(`rules:${rule.id}`));
        });
        rule.supportingClaimIds.forEach(id => {
          assertRef('rules', rule.id, 'supportingClaimIds', id, claimIds.has(id), fileIndex.get(`rules:${rule.id}`));
        });
        rule.relatedPracticeIds.forEach(id => {
          assertRef('rules', rule.id, 'relatedPracticeIds', id, practiceIds.has(id), fileIndex.get(`rules:${rule.id}`));
        });
        rule.sourceEntityIds.forEach(id => {
          assertRef('rules', rule.id, 'sourceEntityIds', id, entityIds.has(id), fileIndex.get(`rules:${rule.id}`));
        });
      });

      collections.claims.forEach(claim => {
        claim.sourceTextIds.forEach(id => {
          assertRef('claims', claim.id, 'sourceTextIds', id, textIds.has(id), fileIndex.get(`claims:${claim.id}`));
        });
        claim.aboutEntityIds.forEach(id => {
          assertRef('claims', claim.id, 'aboutEntityIds', id, entityIds.has(id), fileIndex.get(`claims:${claim.id}`));
        });
        claim.sourceEntityIds.forEach(id => {
          assertRef('claims', claim.id, 'sourceEntityIds', id, entityIds.has(id), fileIndex.get(`claims:${claim.id}`));
        });
      });

      collections.media.forEach(asset => {
        asset.linkedEntityIds.forEach(id => {
          assertRef('media', asset.id, 'linkedEntityIds', id, entityIds.has(id), fileIndex.get(`media:${asset.id}`));
        });
        asset.linkedPracticeIds.forEach(id => {
          assertRef('media', asset.id, 'linkedPracticeIds', id, practiceIds.has(id), fileIndex.get(`media:${asset.id}`));
        });
        asset.linkedEventIds.forEach(id => {
          assertRef('media', asset.id, 'linkedEventIds', id, eventIds.has(id), fileIndex.get(`media:${asset.id}`));
        });
        asset.linkedTextIds.forEach(id => {
          assertRef('media', asset.id, 'linkedTextIds', id, textIds.has(id), fileIndex.get(`media:${asset.id}`));
        });
      });

      collections.notes.forEach(note => {
        let targetCollectionName;
        switch (note.targetType) {
          case 'Movement':
            targetCollectionName = 'movements';
            break;
          case 'TextNode':
            targetCollectionName = 'texts';
            break;
          case 'Entity':
            targetCollectionName = 'entities';
            break;
          case 'Practice':
            targetCollectionName = 'practices';
            break;
          case 'Event':
            targetCollectionName = 'events';
            break;
          case 'Rule':
            targetCollectionName = 'rules';
            break;
          case 'Claim':
            targetCollectionName = 'claims';
            break;
          case 'MediaAsset':
            targetCollectionName = 'media';
            break;
          default:
            throw new Error(`Invalid note targetType ${note.targetType} for ${note.id}`);
        }
        const targetCollection = data[targetCollectionName] || [];
        const target = targetCollection.find(item => item.id === note.targetId);
        assertRef('notes', note.id, 'targetId', note.targetId, !!target, fileIndex.get(`notes:${note.id}`));
        if (targetCollectionName === 'movements') {
          if (!movementExists || note.targetId !== movementId) {
            throw new Error(
              `Invalid reference: notes/${note.id} must target its own movement (${movementId})`
            );
          }
        } else if (target && target.movementId && target.movementId !== movementId) {
          throw new Error(
            `Invalid reference: notes/${note.id} targets ${note.targetType}/${note.targetId} from a different movement`
          );
        }
      });
    });
  }

  function compileRecords(records, specVersion) {
    const resolvedSpecVersion = resolveSpecVersion(specVersion);
    const collectionNames = listCollections(resolvedSpecVersion);
    const data = ensureDataShape(resolvedSpecVersion);
    const fileIndex = new Map();
    const rawMarkdownByPath = {};

    records.forEach(({ collection, frontMatter, body, filePath, rawText }) => {
      const compiler = COMPILERS[collection];
      if (!compiler) return;
      const compiled = compiler(frontMatter, body, filePath);
      data[collection].push(compiled);
      fileIndex.set(`${collection}:${compiled.id}`, filePath);
      if (rawText !== undefined) {
        rawMarkdownByPath[filePath] = rawText;
      }
    });

    validateDuplicates(data, collectionNames);
    validateMovementLinks(data, collectionNames);
    validateReferences(data, fileIndex, collectionNames);

    const sorted = ensureDataShape(resolvedSpecVersion);
    collectionNames.forEach(name => {
      sorted[name] = sortCollection(data[name]);
    });

    return {
      data: sorted,
      fileIndex: Object.fromEntries(fileIndex),
      rawMarkdownByPath
    };
  }

  function detectCollectionFromPath(path, collectionNames) {
    const parts = path.split('/').filter(Boolean);
    const filename = parts[parts.length - 1];
    if (!/\.md$/i.test(filename)) return null;

    if (parts[0] === 'data' && parts.length >= 3) {
      const collectionDir = parts[1];
      return collectionNames.includes(collectionDir) ? collectionDir : null;
    }

    if (parts[0] === 'movements' && parts.length >= 3) {
      if (filename === 'movement.md') return 'movements';
      const collectionDir = parts[2];
      return collectionNames.includes(collectionDir) ? collectionDir : null;
    }

    return null;
  }

  async function readMarkdownRecords(reader, repoListing, specVersion) {
    const collectionNames = listCollections(resolveSpecVersion(specVersion));
    const records = [];
    const files = Array.isArray(repoListing.files) ? repoListing.files : repoListing;
    const paths = files.filter(path => detectCollectionFromPath(path, collectionNames));

    if (paths.length === 0) {
      throw new Error('No markdown records were found under the expected data/ folders.');
    }

    for (const path of paths) {
      const collection = detectCollectionFromPath(path, collectionNames);
      const text = await reader.readText(path, repoListing.ref, repoListing.commitSha);
      const parsed = parseFrontMatter(text, path);
      records.push({
        collection,
        frontMatter: parsed.frontMatter,
        body: parsed.body,
        filePath: path,
        rawText: text
      });
    }
    return records;
  }

  async function prepareRepoSource(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Source config is required to load a movement dataset.');
    }
    const rootPath = config.rootPath || '';
    if (typeof rootPath === 'string' && rootPath.endsWith('.json')) {
      throw new Error('JSON sources are not supported in v2.3. Provide a markdown repository path.');
    }

    let reader;
    let listing;
    let repoInfo = null;
    if (config.source === 'local') {
      reader = createLocalRepoReader(config.repoPath || config.root || '.');
      const files = await reader.listFiles(rootPath);
      listing = { files };
    } else if (config.source === 'github') {
      if (!config.repoUrl) {
        throw new Error('repoUrl is required for GitHub sources.');
      }
      reader = createGitHubRepoReader(config);
      listing = await reader.listFiles(rootPath);
      repoInfo = reader.getRepoInfo ? reader.getRepoInfo() : null;
      if (repoInfo) {
        repoInfo.ref = listing.ref || repoInfo.ref || null;
        repoInfo.commitSha = listing.commitSha || null;
      }
    } else {
      throw new Error('Unknown source type. Use { source: "local" } or { source: "github" }.');
    }

    return { reader, listing, repoInfo };
  }

  async function loadMovementDataset(config) {
    const { reader, listing, repoInfo } = await prepareRepoSource(config);

    const specVersion = DEFAULT_SPEC_VERSION;
    const records = await readMarkdownRecords(reader, listing, specVersion);
    const compiled = compileRecords(records, specVersion);
    const validationConfig = getValidationConfig();
    const shadowValidation = getShadowValidation();
    const legacyAdapter = getLegacyAdapter();
    const validationSettings = validationConfig?.getValidationSettings
      ? validationConfig.getValidationSettings()
      : { shadowEnabled: false, maxIssues: 500, logExamples: 20 };

    const legacyIssues = legacyAdapter?.normalizeLegacyIssues
      ? legacyAdapter.normalizeLegacyIssues([])
      : [];

    if (validationSettings.shadowEnabled && shadowValidation?.runShadowValidation) {
      const model = getModel(specVersion);
      const { modelReport, diff } = shadowValidation.runShadowValidation({
        snapshot: compiled.data,
        model,
        legacyIssues,
        options: {
          maxIssues: validationSettings.maxIssues,
          logExamples: validationSettings.logExamples,
          mode: 'shadow'
        }
      });

      if (modelReport && diff) {
        compiled.data.__debug = compiled.data.__debug || {};
        compiled.data.__debug.modelValidationShadow = { modelReport, diff };
      }
    }

    return {
      specVersion,
      generatedAt: new Date().toISOString(),
      data: compiled.data,
      repoInfo,
      fileIndex: compiled.fileIndex,
      rawMarkdownByPath: compiled.rawMarkdownByPath
    };
  }

  function getExportSchema(collection, specVersion) {
    const model = getModel(resolveSpecVersion(specVersion));
    if (!model?.getExportSchema) {
      throw new Error('ModelRegistry does not support export schemas.');
    }
    return model.getExportSchema(collection);
  }

  function serialiseValue(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (Array.isArray(value)) return value.map(v => serialiseValue(v));
    if (typeof value === 'object') return deepClone(value);
    return value;
  }

  function generateNewPath(collection, id, movementId, movementPath) {
    if (movementPath && movementPath.startsWith('movements/')) {
      const parts = movementPath.split('/').filter(Boolean);
      const base = parts.slice(0, 2).join('/');
      if (collection === 'movements') {
        return `${base}/movement.md`;
      }
      return `${base}/${collection}/${id}.md`;
    }

    if (movementPath && movementPath.startsWith('data/')) {
      if (collection === 'movements') {
        const filename = movementPath.split('/').pop();
        return `data/movements/${filename || `${movementId}.md`}`;
      }
      return `data/${collection}/${id}.md`;
    }

    const fallbackBase = movementPath ? movementPath.replace(/\/?[^/]+$/, '') : `movements/${movementId}`;
    if (collection === 'movements') {
      return `${fallbackBase}/movement.md`;
    }
    return `${fallbackBase}/${collection}/${id}.md`;
  }

  function generateMarkdownForRecord(collection, record, specVersion) {
    const schema = getExportSchema(collection, specVersion);
    if (!schema) {
      throw new Error(`Unknown collection for export: ${collection}`);
    }
    const fm = {};
    schema.frontMatterFields.forEach(field => {
      const value = serialiseValue(record[field]);
      if (value !== undefined) {
        fm[field] = value;
      }
    });
    const body = schema.bodyField ? stringOrEmpty(record[schema.bodyField]) : '';
    return renderMarkdown(fm, body);
  }

  function patchMarkdown(originalRaw, collection, baselineRecord, currentRecord, filePath, specVersion) {
    const parsed = parseFrontMatter(originalRaw, filePath || '');
    const schema = getExportSchema(collection, specVersion);
    if (!schema) {
      throw new Error(`Unknown collection for export: ${collection}`);
    }
    const updatedFrontMatter = { ...parsed.frontMatter };
    schema.frontMatterFields.forEach(field => {
      const baselineValue = baselineRecord ? baselineRecord[field] : undefined;
      const currentValue = currentRecord ? currentRecord[field] : undefined;
      if (!deepEqual(currentValue, baselineValue)) {
        const nextValue = serialiseValue(currentValue);
        if (nextValue === undefined) {
          delete updatedFrontMatter[field];
        } else {
          updatedFrontMatter[field] = nextValue;
        }
      }
    });
    let body = parsed.body;
    if (schema.bodyField) {
      const baselineBody = baselineRecord ? baselineRecord[schema.bodyField] : undefined;
      const currentBody = currentRecord ? currentRecord[schema.bodyField] : undefined;
      if (!deepEqual(currentBody, baselineBody)) {
        body = stringOrEmpty(currentBody);
      }
    }
    return renderMarkdown(updatedFrontMatter, body);
  }

  function renderMarkdownForRecord(snapshot, collection, record) {
    if (!snapshot || !collection || !record) return '';

    const fileIndex = snapshot.__repoFileIndex || {};
    const rawByPath = snapshot.__repoRawMarkdownByPath || {};
    const baselineByMovement = snapshot.__repoBaselineByMovement || {};
    const specVersion = resolveSpecVersion(snapshot?.specVersion);

    const movementId = record.movementId || record.id;
    const baseline = baselineByMovement[movementId] || null;

    const key = `${collection}:${record.id}`;
    const path = fileIndex[key] || null;

    const baselineMap = baseline ? baseline[collection] || {} : null;
    const baselineRecord = baselineMap ? baselineMap[record.id] : null;

    const raw = path ? rawByPath[path] : undefined;

    if (raw !== undefined && baselineRecord && deepEqual(record, baselineRecord)) {
      return raw;
    }

    if (raw !== undefined && baselineRecord) {
      return patchMarkdown(raw, collection, baselineRecord, record, path, specVersion);
    }

    return generateMarkdownForRecord(collection, record, specVersion);
  }

  async function exportMovementToZip(snapshot, movementId, options = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('A snapshot is required to export a movement.');
    }
    if (!movementId) {
      throw new Error('movementId is required to export movement markdown.');
    }
    const movement = (snapshot.movements || []).find(m => m.id === movementId);
    if (!movement) {
      throw new Error(`Movement ${movementId} not found in the snapshot.`);
    }
    const baselineByMovement = snapshot.__repoBaselineByMovement || {};
    const baseline = baselineByMovement[movementId];
    if (!baseline) {
      throw new Error('Movement baseline is missing; cannot produce reversible export.');
    }
    const fileIndex = snapshot.__repoFileIndex || {};
    const rawMarkdownByPath = snapshot.__repoRawMarkdownByPath || {};
    const movementPath = fileIndex[`movements:${movementId}`] || null;

    const JSZip = getZipLib();
    const zip = new JSZip();
    let fileCount = 0;

    const movementKey = `movements:${movement.id}`;
    const movementFilePath = fileIndex[movementKey] || generateNewPath('movements', movement.id, movementId, movementPath);
    const movementBaseline = baseline.movements ? baseline.movements[movement.id] : null;
    const movementRaw = rawMarkdownByPath[movementFilePath];
    const movementUnchanged = movementBaseline ? deepEqual(movement, movementBaseline) : false;
    let movementContent;
    if (movementUnchanged && movementRaw !== undefined) {
      movementContent = movementRaw;
    } else if (movementBaseline && movementRaw !== undefined) {
      movementContent = patchMarkdown(
        movementRaw,
        'movements',
        movementBaseline,
        movement,
        movementFilePath,
        snapshot?.specVersion
      );
    } else {
      movementContent = generateMarkdownForRecord('movements', movement, snapshot?.specVersion);
    }
    zip.file(movementFilePath, movementContent);
    fileCount += 1;

    const collectionNames = listCollections(resolveSpecVersion(snapshot?.specVersion));
    collectionNames.forEach(collection => {
      if (collection === 'movements') return;
      const items = normaliseArray(snapshot[collection]).filter(item => item.movementId === movementId);
      items.forEach(item => {
        const key = `${collection}:${item.id}`;
        const path = fileIndex[key] || generateNewPath(collection, item.id, movementId, movementPath);
        const baselineMap = baseline[collection] || {};
        const baselineRecord = baselineMap[item.id];
        const raw = rawMarkdownByPath[path];
        const unchanged = baselineRecord ? deepEqual(item, baselineRecord) : false;
        let content;
        if (unchanged && raw !== undefined) {
          content = raw;
        } else if (baselineRecord && raw !== undefined) {
          content = patchMarkdown(raw, collection, baselineRecord, item, path, snapshot?.specVersion);
        } else {
          content = generateMarkdownForRecord(collection, item, snapshot?.specVersion);
        }
        zip.file(path, content);
        fileCount += 1;
      });
    });

    const outputType = options.outputType || (isNode() ? 'nodebuffer' : 'blob');
    const archive = await zip.generateAsync({
      type: outputType,
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    return {
      archive,
      fileCount,
      movementId,
      repoInfo: snapshot.__repoInfo || null
    };
  }

  async function exportRepoToZip(config, options = {}) {
    const { reader, listing, repoInfo } = await prepareRepoSource(config);
    const files = Array.isArray(listing.files) ? listing.files : listing;
    if (!files || !files.length) {
      throw new Error('No files available to export from the repository.');
    }

    const JSZip = getZipLib();
    const zip = new JSZip();
    const ref = listing.ref || null;
    const commitSha = listing.commitSha || null;

    for (const path of files) {
      let content;
      if (reader.readBinary) {
        content = await reader.readBinary(path, ref, commitSha);
      } else {
        const text = await reader.readText(path, ref, commitSha);
        content = isNode() ? Buffer.from(text, 'utf8') : text;
      }
      zip.file(path, content);
    }

    const outputType = options.outputType || (isNode() ? 'nodebuffer' : 'blob');
    const archive = await zip.generateAsync({
      type: outputType,
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    return {
      archive,
      fileCount: files.length,
      ref,
      commitSha,
      repoInfo
    };
  }

  const api = {
    loadMovementDataset,
    exportRepoToZip,
    exportMovementToZip,
    createLocalRepoReader,
    createGitHubRepoReader,
    parseGitHubRepoUrl,
    buildBaselineByMovement
  };

  api.COLLECTION_REFERENCE_RULES = COLLECTION_REFERENCE_RULES;
  api.NOTE_TARGET_TYPES = NOTE_TARGET_TYPES;
  api.renderMarkdownForRecord = renderMarkdownForRecord;

  async function importMovementRepo(repoUrl) {
    const compiled = await loadMovementDataset({ source: 'github', repoUrl });
    const snapshot = {
      ...compiled.data,
      __repoInfo: compiled.repoInfo || null,
      __repoFileIndex: compiled.fileIndex || {},
      __repoRawMarkdownByPath: compiled.rawMarkdownByPath || {},
      __repoBaselineByMovement: buildBaselineByMovement(compiled.data, compiled.specVersion)
    };
    snapshot.version = snapshot.version || compiled.specVersion;
    snapshot.specVersion = compiled.specVersion;
    return snapshot;
  }

  api.importMovementRepo = importMovementRepo;
  api.exportRepoToZip = exportRepoToZip;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.MarkdownDatasetLoader = api;
    window.GitHubRepoImporter = {
      importMovementRepo
    };
  }
})();
