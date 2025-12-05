/* project-io.js
 *
 * Dual-path import/export for Movement Engineer snapshots.
 * Supports:
 *   - Zip projects (full fidelity, optional assets)
 *   - JSON projects (structure-only convenience)
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./storage'), require('jszip'));
  } else {
    root.ProjectIO = factory(root.StorageService, root.JSZip);
  }
})(typeof self !== 'undefined' ? self : this, function (StorageService, JSZip) {
  if (!StorageService) {
    throw new Error('ProjectIO requires StorageService');
  }
  if (!JSZip) {
    throw new Error('ProjectIO requires JSZip');
  }

  const BODY_FIELDS = {
    texts: 'content',
    notes: 'body'
  };

  const isBrowser = typeof window !== 'undefined' && typeof window.Blob !== 'undefined';

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function normalizeSnapshot(snapshot) {
    return StorageService.ensureAllCollections(clone(snapshot));
  }

  function buildManifest(snapshot) {
    const manifest = {
      format: 'zip',
      schemaVersion: snapshot.version || '3.4',
      generatedAt: new Date().toISOString(),
      collections: {}
    };

    StorageService.COLLECTION_NAMES.forEach(name => {
      manifest.collections[name] = {
        count: Array.isArray(snapshot[name]) ? snapshot[name].length : 0
      };
    });

    return manifest;
  }

  function jsonBlobFromString(payload) {
    if (isBrowser && typeof Blob !== 'undefined') {
      return new Blob([payload], { type: 'application/json' });
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(payload, 'utf8');
    }
    return payload;
  }

  function selectZipOutputType() {
    if (isBrowser) return 'blob';
    if (typeof Buffer !== 'undefined') return 'nodebuffer';
    return 'uint8array';
  }

  function exportSnapshotAsJson(snapshot) {
    const normalized = normalizeSnapshot(snapshot);
    const payload = JSON.stringify(normalized, null, 2);
    return jsonBlobFromString(payload);
  }

  function addCollectionsToZip(zip, snapshot) {
    const collectionsFolder = zip.folder('collections');
    StorageService.COLLECTION_NAMES.forEach(name => {
      const bodyField = BODY_FIELDS[name];
      const collFolder = collectionsFolder.folder(name);
      const items = Array.isArray(snapshot[name]) ? snapshot[name] : [];
      if (bodyField) {
        const metaFolder = collFolder.folder('meta');
        const bodyFolder = collFolder.folder('bodies');
        items.forEach(item => {
          const { [bodyField]: body, ...meta } = item;
          metaFolder.file(`${item.id}.json`, JSON.stringify(meta, null, 2));
          if (body !== undefined && body !== null && String(body).length) {
            bodyFolder.file(`${item.id}.md`, String(body));
          }
        });
      } else {
        items.forEach(item => {
          collFolder.file(`${item.id}.json`, JSON.stringify(item, null, 2));
        });
      }
    });
  }

  async function exportSnapshotAsZip(snapshot, mediaBlobsByPath = {}) {
    const normalized = normalizeSnapshot(snapshot);
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(buildManifest(normalized), null, 2));
    zip.file('snapshot.json', JSON.stringify(normalized, null, 2));
    addCollectionsToZip(zip, normalized);

    Object.entries(mediaBlobsByPath).forEach(([path, blob]) => {
      zip.file(path, blob);
    });

    const type = selectZipOutputType();
    return zip.generateAsync({ type });
  }

  async function readAsString(file) {
    if (typeof file === 'string') return file;
    if (file && typeof file.text === 'function') {
      return file.text();
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
      return file.toString('utf8');
    }
    if (file instanceof ArrayBuffer) {
      return new TextDecoder().decode(new Uint8Array(file));
    }
    if (ArrayBuffer.isView(file)) {
      return new TextDecoder().decode(file);
    }
    throw new Error('Unsupported input type for JSON import');
  }

  function isZipBinary(input) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
      return input.length >= 2 && input[0] === 0x50 && input[1] === 0x4b;
    }
    if (input instanceof Uint8Array) {
      return input.length >= 2 && input[0] === 0x50 && input[1] === 0x4b;
    }
    if (input instanceof ArrayBuffer) {
      const view = new Uint8Array(input.slice(0, 2));
      return view[0] === 0x50 && view[1] === 0x4b;
    }
    return false;
  }

  function inferName(file) {
    if (!file) return '';
    if (typeof file.name === 'string') return file.name;
    return '';
  }

  function normalizeImportedSnapshot(raw) {
    // Backward compatibility for the legacy wrapped JSON export shape
    // { format: 'json', schemaVersion: '3.4', data: { ...snapshot } }
    if (raw && raw.format === 'json' && raw.data) {
      return StorageService.ensureAllCollections(raw.data);
    }
    return StorageService.ensureAllCollections(raw);
  }

  async function importJsonProject(file) {
    const jsonText = await readAsString(file);
    const parsed = JSON.parse(jsonText);
    return normalizeImportedSnapshot(parsed);
  }

  function computeNextCollectionsFromFolders(zip, name, bodyField, snapshot) {
    const folder = zip.folder(`collections/${name}`);
    if (!folder) return;
    const metaFolder = bodyField ? folder.folder('meta') : null;
    const bodyFolder = bodyField ? folder.folder('bodies') : null;

    const metaFiles = bodyField && metaFolder ? metaFolder.file(/\.json$/) : [];
    const bodyFiles = bodyField && bodyFolder ? bodyFolder.file(/\.md$/) : [];
    const combined = {};

    metaFiles.forEach(file => {
      const id = file.name.split('/').pop().replace(/\.json$/, '');
      combined[id] = file;
    });
    bodyFiles.forEach(file => {
      const id = file.name.split('/').pop().replace(/\.md$/, '');
      combined[id] = combined[id] || {};
      combined[id]._bodyFile = file;
    });

    const result = [];
    const tasks = Object.entries(combined).map(async ([id, fileOrPair]) => {
      if (fileOrPair._bodyFile) {
        const bodyText = await fileOrPair._bodyFile.async('string');
        const metaFile = fileOrPair._bodyFile && combined[id].name ? combined[id] : null;
        const meta = metaFile && typeof metaFile.async === 'function'
          ? JSON.parse(await metaFile.async('string'))
          : {};
        result.push({ id, ...meta, [bodyField]: bodyText });
      } else if (typeof fileOrPair.async === 'function') {
        const meta = JSON.parse(await fileOrPair.async('string'));
        result.push(meta);
      }
    });

    return Promise.all(tasks).then(() => {
      snapshot[name] = result;
    });
  }

  async function importZipProject(file) {
    const zip = await JSZip.loadAsync(file);
    const snapshotFile = zip.file('snapshot.json');
    if (snapshotFile) {
      const parsed = JSON.parse(await snapshotFile.async('string'));
      return normalizeImportedSnapshot(parsed);
    }

    const snapshot = StorageService.createEmptySnapshot();
    const loadTasks = StorageService.COLLECTION_NAMES.map(name => {
      const bodyField = BODY_FIELDS[name];
      if (bodyField) {
        return computeNextCollectionsFromFolders(zip, name, bodyField, snapshot);
      }
      const folder = zip.folder(`collections/${name}`);
      if (!folder) return null;
      const files = folder.file(/\.json$/);
      return Promise.all(
        files.map(async f => {
          const parsed = JSON.parse(await f.async('string'));
          snapshot[name].push(parsed);
        })
      );
    });

    await Promise.all(loadTasks.filter(Boolean));
    return snapshot;
  }

  async function importProject(file) {
    const name = inferName(file).toLowerCase();
    if (name.endsWith('.zip') || name.endsWith('.movement')) {
      return importZipProject(file);
    }
    if (isZipBinary(file)) {
      return importZipProject(file);
    }
    return importJsonProject(file);
  }

  async function exportProject(snapshot, format = 'zip', mediaBlobsByPath = {}) {
    if (format === 'json') {
      return exportSnapshotAsJson(snapshot);
    }
    return exportSnapshotAsZip(snapshot, mediaBlobsByPath);
  }

  return {
    exportProject,
    exportSnapshotAsJson,
    exportSnapshotAsZip,
    importProject
  };
});
