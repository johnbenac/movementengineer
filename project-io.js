/* project-io.js
 *
 * Import/export helpers for Movement Engineer projects.
 *
 * Supports a dual-path story:
 *  - Native zip container (full fidelity, includes assets folder)
 *  - Lightweight JSON (structure only, no embedded binaries)
 */

(function (rootFactory) {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
          ? global
          : {};

  const ProjectIO = rootFactory(globalScope);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectIO;
  }
  if (globalScope) {
    globalScope.ProjectIO = ProjectIO;
  }
})(function (globalScope) {
  'use strict';

  const StorageService =
    globalScope.StorageService || (typeof require !== 'undefined' ? require('./storage') : null);
  const JSZipLib =
    (globalScope && globalScope.JSZip) || (typeof require !== 'undefined' ? require('jszip') : null);

  if (!StorageService) {
    throw new Error('StorageService not available for ProjectIO');
  }

  if (!JSZipLib) {
    throw new Error('JSZip not available for ProjectIO');
  }

  const COLLECTION_NAMES = StorageService.COLLECTION_NAMES;
  const hasBuffer = typeof Buffer !== 'undefined';

  let currentZip = null;
  let assetIndex = {};

  const isBrowser = typeof window !== 'undefined' && typeof Blob !== 'undefined';

  function toBlobOrBuffer(content, mimeType) {
    if (isBrowser) {
      return new Blob([content], { type: mimeType });
    }
    if (hasBuffer) {
      return Buffer.isBuffer(content) ? content : Buffer.from(content);
    }
    throw new Error('Buffer is not available in this environment');
  }

  function getZipOutputType() {
    return isBrowser ? 'blob' : 'nodebuffer';
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function buildManifest(snapshot, options = {}) {
    const collections = {};
    COLLECTION_NAMES.forEach(name => {
      const items = Array.isArray(snapshot[name]) ? snapshot[name] : [];
      collections[name] = {
        count: items.length
      };
    });

    return {
      format: 'zip',
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      version: snapshot.version || null,
      notes: options.notes || null,
      collections
    };
  }

  function addCollectionToZip(zip, snapshot) {
    const collectionsFolder = zip.folder('collections');
    COLLECTION_NAMES.forEach(name => {
      const colFolder = collectionsFolder.folder(name);
      const items = Array.isArray(snapshot[name]) ? snapshot[name] : [];

      if (name === 'texts') {
        const metaFolder = colFolder.folder('meta');
        const bodyFolder = colFolder.folder('bodies');
        items.forEach(item => {
          const { content, ...rest } = item;
          metaFolder.file(`${item.id}.json`, JSON.stringify(rest, null, 2));
          if (typeof content === 'string' && content.length) {
            bodyFolder.file(`${item.id}.md`, content);
          }
        });
        return;
      }

      if (name === 'notes') {
        const metaFolder = colFolder.folder('meta');
        const bodyFolder = colFolder.folder('bodies');
        items.forEach(item => {
          const { body, ...rest } = item;
          metaFolder.file(`${item.id}.json`, JSON.stringify(rest, null, 2));
          if (typeof body === 'string' && body.length) {
            bodyFolder.file(`${item.id}.md`, body);
          }
        });
        return;
      }

      items.forEach(item => {
        colFolder.file(`${item.id}.json`, JSON.stringify(item, null, 2));
      });
    });
  }

  async function readCollectionFromZip(snapshot, zip, name) {
    const collectionsFolder = zip.folder('collections');
    if (!collectionsFolder) return;
    const colFolder = collectionsFolder.folder(name);
    if (!colFolder) return;

    if (name === 'texts') {
      const metaFolder = colFolder.folder('meta');
      const bodyFolder = colFolder.folder('bodies');
      const byId = {};

      const metaFiles = metaFolder ? await metaFolder.file(/\.json$/) : [];
      for (const f of metaFiles) {
        const raw = await f.async('string');
        const id = f.name.replace(/^.*\/([^/]+)\.json$/, '$1');
        byId[id] = JSON.parse(raw);
      }

      const bodyFiles = bodyFolder ? await bodyFolder.file(/\.md$/) : [];
      for (const f of bodyFiles) {
        const text = await f.async('string');
        const id = f.name.replace(/^.*\/([^/]+)\.md$/, '$1');
        byId[id] = byId[id] || { id };
        byId[id].content = text;
      }

      snapshot[name] = Object.values(byId);
      return;
    }

    if (name === 'notes') {
      const metaFolder = colFolder.folder('meta');
      const bodyFolder = colFolder.folder('bodies');
      const byId = {};

      const metaFiles = metaFolder ? await metaFolder.file(/\.json$/) : [];
      for (const f of metaFiles) {
        const raw = await f.async('string');
        const id = f.name.replace(/^.*\/([^/]+)\.json$/, '$1');
        byId[id] = JSON.parse(raw);
      }

      const bodyFiles = bodyFolder ? await bodyFolder.file(/\.md$/) : [];
      for (const f of bodyFiles) {
        const text = await f.async('string');
        const id = f.name.replace(/^.*\/([^/]+)\.md$/, '$1');
        byId[id] = byId[id] || { id };
        byId[id].body = text;
      }

      snapshot[name] = Object.values(byId);
      return;
    }

    const files = await colFolder.file(/\.json$/);
    const items = [];
    for (const f of files) {
      const raw = await f.async('string');
      items.push(JSON.parse(raw));
    }
    snapshot[name] = items;
  }

  function detectFormatFromName(name = '') {
    const lower = name.toLowerCase();
    if (lower.endsWith('.zip') || lower.endsWith('.movement')) return 'zip';
    if (lower.endsWith('.json')) return 'json';
    return null;
  }

  async function readAsArrayBuffer(input) {
    if (hasBuffer && Buffer.isBuffer(input)) return input;
    if (input instanceof ArrayBuffer) return input;
    if (isBrowser && input instanceof Blob) {
      return input.arrayBuffer();
    }
    if (input && typeof input.arrayBuffer === 'function') {
      return input.arrayBuffer();
    }
    throw new Error('Unsupported binary input for zip import');
  }

  async function readAsString(input) {
    if (typeof input === 'string') return input;
    if (hasBuffer && Buffer.isBuffer(input)) return input.toString('utf8');
    if (input instanceof ArrayBuffer) {
      return hasBuffer ? Buffer.from(input).toString('utf8') : new TextDecoder().decode(input);
    }
    if (isBrowser && input instanceof Blob) {
      return input.text();
    }
    if (input && typeof input.text === 'function') {
      return input.text();
    }
    throw new Error('Unsupported text input for JSON import');
  }

  function resetAssetIndex() {
    currentZip = null;
    assetIndex = {};
  }

  async function exportJson(snapshot, options = {}) {
    const payload = {
      format: 'json',
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      version: snapshot.version || null,
      notes: options.notes || null,
      snapshot: snapshot
    };
    const json = JSON.stringify(payload, null, 2);
    return toBlobOrBuffer(json, 'application/json');
  }

  async function exportZip(snapshot, options = {}) {
    const zip = new JSZipLib();
    const normalized = StorageService.ensureAllCollections(clone(snapshot));
    zip.file('manifest.json', JSON.stringify(buildManifest(normalized, options), null, 2));
    zip.file('snapshot.json', JSON.stringify(normalized, null, 2));
    addCollectionToZip(zip, normalized);

    const assets = options.assets || {};
    Object.keys(assets).forEach(path => {
      zip.file(path, assets[path]);
    });

    return zip.generateAsync({ type: getZipOutputType(), compression: 'DEFLATE' });
  }

  async function exportProject(snapshot, options = {}) {
    const normalized = StorageService.ensureAllCollections(clone(snapshot));
    const format = options.format || 'zip';
    if (format === 'json') {
      return exportJson(normalized, options);
    }
    return exportZip(normalized, options);
  }

  async function importJson(input) {
    const raw = await readAsString(input);
    const parsed = JSON.parse(raw);
    if (parsed && parsed.snapshot) {
      return StorageService.ensureAllCollections(parsed.snapshot);
    }
    return StorageService.ensureAllCollections(parsed);
  }

  async function importZip(input) {
    const ab = await readAsArrayBuffer(input);
    const zip = await JSZipLib.loadAsync(ab);
    currentZip = zip;
    assetIndex = {};

    zip.forEach((relativePath, entry) => {
      if (relativePath.startsWith('assets/')) {
        assetIndex[relativePath] = entry;
      }
    });

    const snapshotFile = zip.file('snapshot.json');
    if (snapshotFile) {
      const raw = await snapshotFile.async('string');
      return StorageService.ensureAllCollections(JSON.parse(raw));
    }

    const snapshot = StorageService.createEmptySnapshot();
    for (const name of COLLECTION_NAMES) {
      // eslint-disable-next-line no-await-in-loop
      await readCollectionFromZip(snapshot, zip, name);
    }
    return StorageService.ensureAllCollections(snapshot);
  }

  async function importProject(input) {
    resetAssetIndex();
    const guessed = detectFormatFromName(input && input.name);
    if (guessed === 'zip') return importZip(input);
    if (guessed === 'json') return importJson(input);

    // If not obvious, try zip first then fall back to JSON.
    try {
      return await importZip(input);
    } catch (zipErr) {
      try {
        return await importJson(input);
      } catch (jsonErr) {
        const error = new Error('Unsupported project file. Tried zip and json.');
        error.zipError = zipErr;
        error.jsonError = jsonErr;
        throw error;
      }
    }
  }

  async function getAssetBlob(path) {
    if (!assetIndex[path]) return null;
    if (!currentZip) return null;
    const target = assetIndex[path];
    const type = getZipOutputType();
    if (type === 'blob') return target.async('blob');
    return target.async('nodebuffer');
  }

  function listAssetPaths() {
    return Object.keys(assetIndex).slice();
  }

  return {
    exportProject,
    importProject,
    getAssetBlob,
    listAssetPaths
  };
});
