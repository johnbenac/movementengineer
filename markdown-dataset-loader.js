(function () {
  'use strict';

  const SPEC_VERSION = '2.3';
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

  function getYamlLib() {
    if (isNode()) return require('js-yaml');
    if (typeof window !== 'undefined' && window.jsyaml) return window.jsyaml;
    throw new Error('YAML parser not available. Ensure js-yaml is loaded.');
  }

  function normaliseArray(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(v => v !== undefined && v !== null);
  }

  function stringOrNull(value) {
    if (typeof value === 'string') return value;
    return value === undefined || value === null ? null : String(value);
  }

  function stringOrEmpty(value) {
    return typeof value === 'string' ? value : '';
  }

  function numberOrNull(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function trimBody(body) {
    if (!body) return '';
    return String(body).trim();
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
    const res = await fetch(url);
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
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${path} (${res.status} ${res.statusText}).`);
      }
      return res.text();
    }

    return { listFiles, readText };
  }

  // ------------------------
  // Compiler helpers
  // ------------------------

  function ensureDataShape() {
    const data = {};
    COLLECTION_NAMES.forEach(name => {
      data[name] = [];
    });
    return data;
  }

  function compileMovement(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const name = stringOrNull(frontMatter.name);
    if (!id || !name) {
      throw new Error(`Movement is missing required id or name (${filePath})`);
    }
    return {
      id,
      movementId: stringOrNull(frontMatter.movementId) || id,
      name,
      shortName: stringOrNull(frontMatter.shortName),
      tags: normaliseArray(frontMatter.tags).map(String),
      summary: trimBody(body),
      status: stringOrNull(frontMatter.status),
      order: numberOrNull(frontMatter.order)
    };
  }

  function compileTextCollection(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
    const name = stringOrNull(frontMatter.name);
    if (!id || !movementId || !name) {
      throw new Error(`TextCollection missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      name,
      rootTextIds: normaliseArray(frontMatter.rootTextIds).map(String),
      description: trimBody(body),
      tags: normaliseArray(frontMatter.tags).map(String),
      order: numberOrNull(frontMatter.order)
    };
  }

  function compileText(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
    const title = stringOrNull(frontMatter.title);
    if (!id || !movementId || !title) {
      throw new Error(`Text missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      title,
      label: stringOrNull(frontMatter.label),
      parentId: stringOrNull(frontMatter.parentId),
      mainFunction: stringOrNull(frontMatter.mainFunction),
      tags: normaliseArray(frontMatter.tags).map(String),
      mentionsEntityIds: normaliseArray(frontMatter.mentionsEntityIds).map(String),
      order: numberOrNull(frontMatter.order),
      content: trimBody(body)
    };
  }

  function compileEntity(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
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
      sourceEntityIds: normaliseArray(frontMatter.sourceEntityIds).map(String),
      sourcesOfTruth: normaliseArray(frontMatter.sourcesOfTruth).map(String),
      order: numberOrNull(frontMatter.order),
      summary: trimBody(body)
    };
  }

  function compilePractice(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
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
      involvedEntityIds: normaliseArray(frontMatter.involvedEntityIds).map(String),
      instructionsTextIds: normaliseArray(frontMatter.instructionsTextIds).map(String),
      supportingClaimIds: normaliseArray(frontMatter.supportingClaimIds).map(String),
      sourceEntityIds: normaliseArray(frontMatter.sourceEntityIds).map(String),
      sourcesOfTruth: normaliseArray(frontMatter.sourcesOfTruth).map(String),
      order: numberOrNull(frontMatter.order),
      description: trimBody(body)
    };
  }

  function compileEvent(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
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
      mainPracticeIds: normaliseArray(frontMatter.mainPracticeIds).map(String),
      mainEntityIds: normaliseArray(frontMatter.mainEntityIds).map(String),
      readingTextIds: normaliseArray(frontMatter.readingTextIds).map(String),
      supportingClaimIds: normaliseArray(frontMatter.supportingClaimIds).map(String),
      order: numberOrNull(frontMatter.order),
      description: trimBody(body)
    };
  }

  function compileRule(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
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
      supportingTextIds: normaliseArray(frontMatter.supportingTextIds).map(String),
      supportingClaimIds: normaliseArray(frontMatter.supportingClaimIds).map(String),
      relatedPracticeIds: normaliseArray(frontMatter.relatedPracticeIds).map(String),
      sourceEntityIds: normaliseArray(frontMatter.sourceEntityIds).map(String),
      sourcesOfTruth: normaliseArray(frontMatter.sourcesOfTruth).map(String),
      order: numberOrNull(frontMatter.order)
    };
  }

  function compileClaim(frontMatter, _body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
    const text = stringOrNull(frontMatter.text);
    if (!id || !movementId || !text) {
      throw new Error(`Claim missing required fields (${filePath})`);
    }
    return {
      id,
      movementId,
      text,
      category: stringOrNull(frontMatter.category),
      tags: normaliseArray(frontMatter.tags).map(String),
      aboutEntityIds: normaliseArray(frontMatter.aboutEntityIds).map(String),
      sourceTextIds: normaliseArray(frontMatter.sourceTextIds).map(String),
      sourceEntityIds: normaliseArray(frontMatter.sourceEntityIds).map(String),
      sourcesOfTruth: normaliseArray(frontMatter.sourcesOfTruth).map(String),
      order: numberOrNull(frontMatter.order)
    };
  }

  function compileMedia(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
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
      linkedEntityIds: normaliseArray(frontMatter.linkedEntityIds).map(String),
      linkedPracticeIds: normaliseArray(frontMatter.linkedPracticeIds).map(String),
      linkedEventIds: normaliseArray(frontMatter.linkedEventIds).map(String),
      linkedTextIds: normaliseArray(frontMatter.linkedTextIds).map(String),
      order: numberOrNull(frontMatter.order),
      description: trimBody(body)
    };
  }

  function compileNote(frontMatter, body, filePath) {
    const id = stringOrNull(frontMatter.id);
    const movementId = stringOrNull(frontMatter.movementId);
    const rawTarget = frontMatter.targetType;
    const targetId = stringOrNull(frontMatter.targetId);
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

  function validateDuplicates(data) {
    COLLECTION_NAMES.forEach(collection => {
      const seen = new Set();
      data[collection].forEach(item => {
        if (seen.has(item.id)) {
          throw new Error(`Duplicate id detected in ${collection}: ${item.id}`);
        }
        seen.add(item.id);
      });
    });
  }

  function validateMovementLinks(data) {
    const movementIds = new Set(data.movements.map(m => m.id));
    data.movements.forEach(movement => {
      if (movement.movementId !== movement.id) {
        throw new Error(`Movement ${movement.id} must set movementId equal to id.`);
      }
    });

    COLLECTION_NAMES.forEach(collection => {
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

  function buildMovementIndexes(data) {
    const byMovement = {};
    data.movements.forEach(movement => {
      byMovement[movement.id] = {};
      COLLECTION_NAMES.forEach(collection => {
        byMovement[movement.id][collection] = [];
      });
    });

    COLLECTION_NAMES.forEach(collection => {
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

  function validateReferences(data, fileIndex) {
    const byMovement = buildMovementIndexes(data);
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

  function compileRecords(records) {
    const data = ensureDataShape();
    const fileIndex = new Map();

    records.forEach(({ collection, frontMatter, body, filePath }) => {
      const compiler = COMPILERS[collection];
      if (!compiler) return;
      const compiled = compiler(frontMatter, body, filePath);
      data[collection].push(compiled);
      fileIndex.set(`${collection}:${compiled.id}`, filePath);
    });

    validateDuplicates(data);
    validateMovementLinks(data);
    validateReferences(data, fileIndex);

    const sorted = ensureDataShape();
    COLLECTION_NAMES.forEach(name => {
      sorted[name] = sortCollection(data[name]);
    });

    return sorted;
  }

  function detectCollectionFromPath(path) {
    const parts = path.split('/').filter(Boolean);
    if (parts[0] !== 'data' || parts.length < 3) return null;
    const collectionDir = parts[1];
    if (!COLLECTION_NAMES.includes(collectionDir)) return null;
    if (!/\.md$/i.test(parts[parts.length - 1])) return null;
    return collectionDir;
  }

  async function readMarkdownRecords(reader, repoListing) {
    const records = [];
    const files = Array.isArray(repoListing.files) ? repoListing.files : repoListing;
    const paths = files.filter(path => detectCollectionFromPath(path));

    if (paths.length === 0) {
      throw new Error('No markdown records were found under the expected data/ folders.');
    }

    for (const path of paths) {
      const collection = detectCollectionFromPath(path);
      const text = await reader.readText(path, repoListing.ref, repoListing.commitSha);
      const parsed = parseFrontMatter(text, path);
      records.push({
        collection,
        frontMatter: parsed.frontMatter,
        body: parsed.body,
        filePath: path
      });
    }
    return records;
  }

  async function loadMovementDataset(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Source config is required to load a movement dataset.');
    }
    const rootPath = config.rootPath || 'data';
    if (typeof rootPath === 'string' && rootPath.endsWith('.json')) {
      throw new Error('JSON sources are not supported in v2.3. Provide a markdown repository path.');
    }

    let reader;
    let listing;
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
    } else {
      throw new Error('Unknown source type. Use { source: "local" } or { source: "github" }.');
    }

    const records = await readMarkdownRecords(reader, listing);
    const data = compileRecords(records);

    return {
      specVersion: SPEC_VERSION,
      generatedAt: new Date().toISOString(),
      data
    };
  }

  const api = {
    loadMovementDataset,
    createLocalRepoReader,
    createGitHubRepoReader,
    parseGitHubRepoUrl
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.MarkdownDatasetLoader = api;
  }
})();
