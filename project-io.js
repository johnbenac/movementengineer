/* project-io.js
 *
 * Provides dual import/export paths for Movement Engineer snapshots:
 * - Zip (first-class, includes per-collection files and optional assets)
 * - JSON (lightweight, structure-only convenience)
 */

(function () {
  'use strict';

  const StorageService =
    typeof require === 'function' && typeof module !== 'undefined'
      ? require('./storage')
      : window.StorageService;

  const JSZip =
    typeof window !== 'undefined' && window.JSZip
      ? window.JSZip
      : require('jszip');

  const DEFAULT_SCHEMA_VERSION = '3.4';

  const COLLECTION_NAMES = StorageService.COLLECTION_NAMES;

  function normaliseSnapshot(snapshot) {
    const normalised = StorageService.ensureAllCollections(snapshot || {});
    if (!normalised.version) normalised.version = DEFAULT_SCHEMA_VERSION;
    return normalised;
  }

  function buildManifest(snapshot, options = {}) {
    const collectionsMeta = {};
    COLLECTION_NAMES.forEach(name => {
      const items = Array.isArray(snapshot[name]) ? snapshot[name] : [];
      collectionsMeta[name] = {
        count: items.length
      };
    });

    return {
      format: 'zip',
      schemaVersion: snapshot.version || DEFAULT_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      notes: options.notes || null,
      collections: collectionsMeta
    };
  }

  function fileNameForItem(item, index) {
    if (item && (item.id || item.id === 0)) return `${item.id}.json`;
    return `${index + 1}.json`;
  }

  function appendCollectionsToZip(zip, snapshot) {
    const collectionsFolder = zip.folder('collections');
    COLLECTION_NAMES.forEach(name => {
      const folder = collectionsFolder.folder(name);
      const items = Array.isArray(snapshot[name]) ? snapshot[name] : [];
      items.forEach((item, idx) => {
        folder.file(fileNameForItem(item, idx), JSON.stringify(item, null, 2));
      });
    });
  }

  async function appendAssetsToZip(zip, assets = {}) {
    const entries = Object.entries(assets);
    for (const [path, value] of entries) {
      if (!path) continue;
      let payload = value;
      if (value instanceof Blob && typeof value.arrayBuffer === 'function') {
        payload = await value.arrayBuffer();
      }
      zip.file(path, payload);
    }
  }

  function getZipOutputType() {
    return typeof Blob !== 'undefined' ? 'blob' : 'nodebuffer';
  }

  async function exportSnapshot(snapshot, options = {}) {
    const format = options.format || 'zip';
    const clean = normaliseSnapshot(snapshot);

    if (format === 'json') {
      const payload = {
        format: 'json',
        schemaVersion: clean.version || DEFAULT_SCHEMA_VERSION,
        exportNotes: options.notes || null,
        snapshot: clean
      };
      return new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json'
      });
    }

    if (format !== 'zip') {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(buildManifest(clean, options), null, 2));
    zip.file('snapshot.json', JSON.stringify(clean, null, 2));
    appendCollectionsToZip(zip, clean);
    await appendAssetsToZip(zip, options.assets);
    return zip.generateAsync({ type: getZipOutputType() });
  }

  function convertToUint8Array(input) {
    if (input instanceof Uint8Array) return input;
    if (typeof ArrayBuffer !== 'undefined' && input instanceof ArrayBuffer)
      return new Uint8Array(input);
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input))
      return new Uint8Array(input);
    return null;
  }

  function sniffFormatFromName(file) {
    if (!file || !file.name) return null;
    if (file.name.endsWith('.zip') || file.name.endsWith('.movement')) return 'zip';
    if (file.name.endsWith('.json')) return 'json';
    return null;
  }

  function isLikelyZip(input) {
    const bytes = convertToUint8Array(input);
    if (!bytes || bytes.length < 2) return false;
    return bytes[0] === 0x50 && bytes[1] === 0x4b; // PK signature
  }

  function resetAssetState() {
    currentZip = null;
    assetIndex = {};
  }

  async function parseJsonPayload(text) {
    const parsed = JSON.parse(text);
    if (parsed.snapshot) return normaliseSnapshot(parsed.snapshot);
    return normaliseSnapshot(parsed);
  }

  async function importFromJson(file) {
    const text = typeof file.text === 'function' ? await file.text() : file.toString('utf8');
    resetAssetState();
    return parseJsonPayload(text);
  }

  async function importFromZip(file) {
    const zip = await JSZip.loadAsync(file);
    currentZip = zip;
    assetIndex = {};

    zip.forEach((relativePath, entry) => {
      if (relativePath.startsWith('assets/')) {
        assetIndex[relativePath] = entry;
      }
    });

    const snapshotFile = zip.file('snapshot.json');
    if (snapshotFile) {
      const text = await snapshotFile.async('string');
      return normaliseSnapshot(JSON.parse(text));
    }

    const collectionsFolder = zip.folder('collections');
    if (!collectionsFolder) throw new Error('Invalid project zip: missing collections');

    const reconstructed = StorageService.createEmptySnapshot();
    reconstructed.version = DEFAULT_SCHEMA_VERSION;

    for (const name of COLLECTION_NAMES) {
      const folder = collectionsFolder.folder(name);
      if (!folder) continue;
      const files = await folder.file(/\.json$/);
      const items = [];
      for (const fileEntry of files) {
        const text = await fileEntry.async('string');
        items.push(JSON.parse(text));
      }
      reconstructed[name] = items;
    }

    return normaliseSnapshot(reconstructed);
  }

  async function importSnapshot(file) {
    if (!file) throw new Error('No file provided for import');
    const hintedFormat = sniffFormatFromName(file);

    if (hintedFormat === 'json') return importFromJson(file);

    if (hintedFormat === 'zip') return importFromZip(file);

    const maybeZipBytes = convertToUint8Array(file);
    if (maybeZipBytes && isLikelyZip(maybeZipBytes)) {
      return importFromZip(maybeZipBytes);
    }

    return importFromJson(file);
  }

  async function getAssetBlob(path) {
    if (!path) throw new Error('Asset path is required');
    if (!assetIndex[path]) {
      throw new Error(`Asset not found in project: ${path}`);
    }
    const outputType = getZipOutputType();
    if (outputType === 'blob') {
      return assetIndex[path].async('blob');
    }
    const buffer = await assetIndex[path].async('nodebuffer');
    return new Blob([buffer]);
  }

  let currentZip = null;
  let assetIndex = {};

  const ProjectIO = {
    exportSnapshot,
    importSnapshot,
    getAssetBlob
  };

  if (typeof module !== 'undefined') {
    module.exports = ProjectIO;
  }
  if (typeof window !== 'undefined') {
    window.ProjectIO = ProjectIO;
  }
})();
