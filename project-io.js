(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const root = typeof window !== 'undefined' ? window : global;
  const JSZip = root.JSZip || require('jszip');
  const StorageService = root.StorageService || require('./storage');

  const COLLECTION_NAMES = StorageService.COLLECTION_NAMES;
  const BODY_COLLECTIONS = {
    texts: 'content',
    notes: 'body'
  };

  let importedAssetEntries = new Map();

  function normalizeSnapshot(snapshot) {
    return StorageService.ensureAllCollections(snapshot || {});
  }

  function buildManifest(snapshot, assetPaths) {
    const collections = {};
    COLLECTION_NAMES.forEach(name => {
      collections[name] = {
        count: Array.isArray(snapshot[name]) ? snapshot[name].length : 0
      };
    });
    return {
      format: 'zip',
      schemaVersion: snapshot.version || 'unknown',
      exportedAt: new Date().toISOString(),
      collections,
      assets: {
        count: assetPaths.length,
        paths: assetPaths
      }
    };
  }

  function exportSnapshotToJson(snapshot) {
    const normalized = normalizeSnapshot(snapshot);
    return JSON.stringify(normalized, null, 2);
  }

  function normalizeAssetPath(path) {
    if (!path) return null;
    if (path.startsWith('assets/')) return path;
    return `assets/${path}`;
  }

  async function exportSnapshotToZip(snapshot, options = {}) {
    const normalized = normalizeSnapshot(snapshot);
    const zip = new JSZip();
    const assetEntries = Object.entries(options.assetBlobs || {})
      .map(([path, blob]) => [normalizeAssetPath(path), blob])
      .filter(([path]) => Boolean(path));

    zip.file(
      'manifest.json',
      JSON.stringify(buildManifest(normalized, assetEntries.map(([p]) => p)), null, 2)
    );
    zip.file('snapshot.json', JSON.stringify(normalized, null, 2));

    const collectionsFolder = zip.folder('collections');
    COLLECTION_NAMES.forEach(name => {
      const items = normalized[name] || [];
      const folder = collectionsFolder.folder(name);
      const bodyField = BODY_COLLECTIONS[name];
      if (bodyField) {
        const meta = folder.folder('meta');
        const bodies = folder.folder('bodies');
        items.forEach(item => {
          const { [bodyField]: body, ...rest } = item;
          const fileName = `${item.id || 'item'}.json`;
          meta.file(fileName, JSON.stringify(rest, null, 2));
          if (typeof body === 'string' && body.length) {
            bodies.file(`${item.id || 'item'}.md`, body);
          }
        });
      } else {
        items.forEach(item => {
          const fileName = `${item.id || 'item'}.json`;
          folder.file(fileName, JSON.stringify(item, null, 2));
        });
      }
    });

    if (assetEntries.length) {
      const assetsFolder = zip.folder('assets');
      assetEntries.forEach(([path, blob]) => {
        if (!path) return;
        const relative = path.replace(/^assets\//, '');
        assetsFolder.file(relative, blob);
      });
    }

    return zip.generateAsync({ type: isNode ? 'nodebuffer' : 'blob' });
  }

  function createEmptySnapshot() {
    if (typeof StorageService.createEmptySnapshot === 'function') {
      return StorageService.createEmptySnapshot();
    }
    return normalizeSnapshot({});
  }

  async function importBodyCollection(folder, bodyField) {
    const metaFolder = folder.folder('meta');
    const bodyFolder = folder.folder('bodies');
    const items = {};

    const metaFiles = metaFolder ? metaFolder.file(/\.json$/) : [];
    for (const file of metaFiles) {
      const id = file.name.replace(/^.*\/([^/]+)\.json$/, '$1');
      const text = await file.async('string');
      items[id] = JSON.parse(text);
    }

    const bodyFiles = bodyFolder ? bodyFolder.file(/\.md$/) : [];
    for (const file of bodyFiles) {
      const id = file.name.replace(/^.*\/([^/]+)\.md$/, '$1');
      const text = await file.async('string');
      items[id] = items[id] || { id };
      items[id][bodyField] = text;
    }

    return Object.values(items);
  }

  async function importSnapshotFromZip(fileOrBuffer) {
    const zip = await JSZip.loadAsync(fileOrBuffer);
    importedAssetEntries = new Map();

    zip.forEach((relativePath, entry) => {
      if (entry.dir) return;
      if (relativePath.startsWith('assets/')) {
        importedAssetEntries.set(relativePath, entry);
      }
    });

    const snapshotFile = zip.file('snapshot.json');
    if (snapshotFile) {
      const raw = await snapshotFile.async('string');
      const parsed = JSON.parse(raw);
      return normalizeSnapshot(parsed);
    }

    const snapshot = createEmptySnapshot();
    const collectionsFolder = zip.folder('collections');
    if (!collectionsFolder) return snapshot;

    for (const name of COLLECTION_NAMES) {
      const folder = collectionsFolder.folder(name);
      if (!folder) continue;
      const bodyField = BODY_COLLECTIONS[name];
      if (bodyField) {
        snapshot[name] = await importBodyCollection(folder, bodyField);
      } else {
        const files = folder.file(/\.json$/);
        const items = [];
        for (const file of files) {
          const raw = await file.async('string');
          items.push(JSON.parse(raw));
        }
        snapshot[name] = items;
      }
    }

    const manifest = zip.file('manifest.json');
    if (manifest && !snapshot.version) {
      try {
        const raw = await manifest.async('string');
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion) snapshot.version = parsed.schemaVersion;
      } catch (e) {
        // Best effort; ignore malformed manifest.
      }
    }

    return normalizeSnapshot(snapshot);
  }

  function listImportedAssetPaths() {
    return Array.from(importedAssetEntries.keys());
  }

  async function getAssetBlob(assetPath) {
    const normalized = normalizeAssetPath(assetPath);
    if (!normalized) return null;
    const entry = importedAssetEntries.get(normalized);
    if (!entry) return null;
    return entry.async(isNode ? 'nodebuffer' : 'blob');
  }

  function importSnapshotFromJsonText(text) {
    return normalizeSnapshot(JSON.parse(text));
  }

  const api = {
    exportSnapshotToJson,
    exportSnapshotToZip,
    importSnapshotFromZip,
    importSnapshotFromJsonText,
    getAssetBlob,
    listImportedAssetPaths
  };

  if (typeof window !== 'undefined') {
    window.ProjectIO = api;
  }
  if (typeof module !== 'undefined') {
    module.exports = api;
  }
})();
